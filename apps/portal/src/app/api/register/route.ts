import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sequelize, User, InvestorOrg } from "@kip/db";
import { fireWebhook } from "@/lib/webhooks";

const registerSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name is too long"),
  country: z.string().min(1, "Country is required"),
  tin: z
    .string()
    .min(3, "TIN / Company Number must be at least 3 characters")
    .max(50, "TIN / Company Number is too long"),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long"),
});

export async function POST(req: NextRequest) {
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

  const { companyName, country, tin, email, phone } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists.", field: "email" },
      { status: 409 },
    );
  }

  const { user: createdUser } = await sequelize.transaction(async (t) => {
    const org = await InvestorOrg.create(
      {
        legalName: companyName,
        countryOfIncorporation: country,
        tin,
        phone,
        email: normalizedEmail,
      },
      { transaction: t },
    );
    const user = await User.create(
      {
        email: normalizedEmail,
        passwordHash: null,
        status: "PENDING_REVIEW",
        role: "INVESTOR",
        investorOrgId: org.id,
      },
      { transaction: t },
    );
    return { org, user };
  });

  fireWebhook("investor-registered", {
    userId: createdUser.id,
    email: normalizedEmail,
    companyName,
    country,
    tin,
    phone,
    registeredAt: new Date().toISOString(),
  }).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201 });
}
