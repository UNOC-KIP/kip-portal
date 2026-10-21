import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { hash } from "bcryptjs";
import { sequelize, User, InvestorOrg } from "@kip/db";
import { CompanyType, BusinessSector, UserRole, UserStatus } from "@kip/shared";
import { fireWebhook } from "@/lib/webhooks";
import { credentialsEmail, portalUrl, sendMail } from "@/lib/mailer";
import {
  HONEYPOT_FIELD,
  clientIp,
  containsLink,
  createRateLimiter,
} from "@/lib/signup-guard";

// Every registration sends an email from the shared Support.Kip mailbox, so
// these limits protect its ~30/min quota as much as the user table.
const perIp = createRateLimiter(5, 60 * 60_000);
const perMailbox = createRateLimiter(2, 24 * 60 * 60_000);
const allSignups = createRateLimiter(60, 60 * 60_000);

const NO_LINKS = "Links are not allowed here";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .max(max, message)
    .refine((v) => !containsLink(v), NO_LINKS)
    .optional()
    .or(z.literal("").transform(() => undefined));

/**
 * Single-step registration. Company registration number, URSB number, TIN,
 * registered address and the company contact block are collected later, during
 * the EOI — their InvestorOrg columns stay nullable.
 */
const registerSchema = z.object({
  // Company identity
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name is too long")
    .refine((v) => !containsLink(v), NO_LINKS),
  tradingName: optionalText(200, "Trading name is too long"),
  country: z.string().min(1, "Country is required"),
  companyType: z.nativeEnum(CompanyType, {
    errorMap: () => ({ message: "Select a company type" }),
  }),
  businessSector: z.nativeEnum(BusinessSector, {
    errorMap: () => ({ message: "Select your primary sector" }),
  }),
  // Authorized representative
  repName: z
    .string()
    .min(2, "Full name is required")
    .max(150, "Name is too long")
    .refine((v) => !containsLink(v), NO_LINKS),
  repDesignation: z
    .string()
    .min(2, "Designation is required")
    .max(100, "Designation is too long")
    .refine((v) => !containsLink(v), NO_LINKS),
  repEmail: z.string().email("Enter a valid email address"),
  repPhone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long")
    .regex(/^[0-9+()\-.\s]+$/, "Enter a valid phone number"),
  [HONEYPOT_FIELD]: z.string().optional(),
});

/** `a.b+7@gmail.com` → `ab@gmail.com` — one real inbox, however many aliases. */
function mailboxKey(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const base = local.split("+")[0] ?? "";
  return `${domain === "gmail.com" || domain === "googlemail.com" ? base.replace(/\./g, "") : base}@${domain}`;
}

const tooMany = () =>
  NextResponse.json(
    { error: "Too many registration attempts. Please try again later." },
    { status: 429 },
  );

/** Same shape as `generatePassword()` in apps/api/src/modules/users/users.service.ts */
function generatePassword(): string {
  return crypto.randomBytes(20).toString("base64url").slice(0, 20);
}

export async function POST(req: NextRequest) {
  const now = Date.now();
  const ip = clientIp(req.headers.get("x-forwarded-for"), req.headers.get("x-real-ip"));
  if (!perIp(ip, now) || !allSignups("all", now)) {
    console.warn("[register] rate limited", { ip });
    return tooMany();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = registerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: result.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const data = result.data;
  const normalizedRepEmail = data.repEmail.toLowerCase().trim();

  // Honeypot filled → a bot. Answer like a success so it learns nothing.
  if (data[HONEYPOT_FIELD]) {
    console.warn("[register] honeypot tripped", { ip, email: normalizedRepEmail });
    return NextResponse.json({ ok: true, emailSent: true }, { status: 201 });
  }

  if (!perMailbox(mailboxKey(normalizedRepEmail), now)) {
    console.warn("[register] mailbox limit", { ip, email: normalizedRepEmail });
    return tooMany();
  }

  const existing = await User.findOne({ where: { email: normalizedRepEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists.", field: "repEmail" },
      { status: 409 },
    );
  }

  // Accounts self-activate — no admin approval gate. The generated password is
  // emailed below and never persisted or forwarded in plaintext anywhere else.
  const plainPassword = generatePassword();
  const passwordHash = await hash(plainPassword, 12);

  let createdUser: User;
  try {
    ({ user: createdUser } = await sequelize.transaction(async (t) => {
      const org = await InvestorOrg.create(
        {
          legalName: data.companyName,
          tradingName: data.tradingName ?? null,
          companyType: data.companyType,
          businessSector: data.businessSector,
          countryOfIncorporation: data.country,
        },
        { transaction: t },
      );
      const user = await User.create(
        {
          email: normalizedRepEmail,
          name: data.repName,
          designation: data.repDesignation,
          phone: data.repPhone,
          passwordHash,
          status: UserStatus.ACTIVE,
          role: UserRole.INVESTOR,
          investorOrgId: org.id,
        },
        { transaction: t },
      );
      return { org, user };
    }));
  } catch (err) {
    // sequelize is not a direct dependency here — match the error by name.
    if (err instanceof Error && err.name === "SequelizeUniqueConstraintError") {
      return NextResponse.json(
        { error: "An account with this email already exists.", field: "repEmail" },
        { status: 409 },
      );
    }
    throw err;
  }

  // Best-effort — the account is already committed, so a mail failure must not
  // fail the request. The response tells the UI whether to promise an email.
  let emailSent = true;
  try {
    await sendMail({
      to: normalizedRepEmail,
      subject: "Your KIP Investor Portal account",
      html: credentialsEmail({
        companyName: data.companyName,
        email: normalizedRepEmail,
        tempPassword: plainPassword,
        portalUrl: portalUrl(),
      }),
    });
  } catch (err) {
    emailSent = false;
    console.error("[register] failed to send credentials email", err);
  }

  // Never include the generated password in the webhook payload.
  fireWebhook("investor-registered", {
    userId: createdUser.id,
    email: normalizedRepEmail,
    companyName: data.companyName,
    tradingName: data.tradingName ?? null,
    companyType: data.companyType,
    businessSector: data.businessSector,
    country: data.country,
    repName: data.repName,
    repDesignation: data.repDesignation,
    repPhone: data.repPhone,
    registeredAt: new Date().toISOString(),
    activatedAt: new Date().toISOString(),
  }).catch(() => {});

  return NextResponse.json({ ok: true, emailSent }, { status: 201 });
}
