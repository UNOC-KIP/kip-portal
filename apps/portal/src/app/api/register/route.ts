import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sequelize, User, InvestorOrg } from "@kip/db";
import { CompanyType, BusinessSector } from "@kip/shared";
import { fireWebhook } from "@/lib/webhooks";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .max(max, message)
    .optional()
    .or(z.literal("").transform(() => undefined));

const registerSchema = z.object({
  // Step 1 — company identity & contact
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name is too long"),
  tradingName: optionalText(200, "Trading name is too long"),
  registrationNumber: z
    .string()
    .min(2, "Certificate of Incorporation / Registration No. is required")
    .max(100, "Registration number is too long"),
  ursbRegistrationNumber: optionalText(100, "URSB registration number is too long"),
  country: z.string().min(1, "Country is required"),
  address: z
    .string()
    .min(5, "Registered office address is required")
    .max(300, "Address is too long"),
  tin: z
    .string()
    .min(3, "TIN must be at least 3 characters")
    .max(50, "TIN is too long"),
  companyType: z.nativeEnum(CompanyType, {
    errorMap: () => ({ message: "Select a company type" }),
  }),
  businessSector: z.nativeEnum(BusinessSector, {
    errorMap: () => ({ message: "Select your primary sector" }),
  }),
  companyEmail: z.string().email("Enter a valid company email address"),
  companyPhone: z
    .string()
    .min(7, "Enter a valid company phone number")
    .max(20, "Company phone number is too long"),
  // Step 2 — authorized representative
  repName: z
    .string()
    .min(2, "Full name is required")
    .max(150, "Name is too long"),
  repDesignation: z
    .string()
    .min(2, "Designation is required")
    .max(100, "Designation is too long"),
  repEmail: z.string().email("Enter a valid email address"),
  repPhone: z
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

  const data = result.data;
  const normalizedRepEmail = data.repEmail.toLowerCase().trim();

  const existing = await User.findOne({ where: { email: normalizedRepEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists.", field: "repEmail" },
      { status: 409 },
    );
  }

  let createdUser: User;
  try {
    ({ user: createdUser } = await sequelize.transaction(async (t) => {
      const org = await InvestorOrg.create(
        {
          legalName: data.companyName,
          tradingName: data.tradingName ?? null,
          registrationNumber: data.registrationNumber,
          ursbRegistrationNumber: data.ursbRegistrationNumber ?? null,
          companyType: data.companyType,
          businessSector: data.businessSector,
          countryOfIncorporation: data.country,
          address: data.address,
          tin: data.tin,
          phone: data.companyPhone,
          email: data.companyEmail.toLowerCase().trim(),
        },
        { transaction: t },
      );
      const user = await User.create(
        {
          email: normalizedRepEmail,
          name: data.repName,
          designation: data.repDesignation,
          phone: data.repPhone,
          passwordHash: null,
          status: "PENDING_REVIEW",
          role: "INVESTOR",
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

  fireWebhook("investor-registered", {
    userId: createdUser.id,
    email: normalizedRepEmail,
    companyName: data.companyName,
    tradingName: data.tradingName ?? null,
    registrationNumber: data.registrationNumber,
    ursbRegistrationNumber: data.ursbRegistrationNumber ?? null,
    companyType: data.companyType,
    businessSector: data.businessSector,
    country: data.country,
    address: data.address,
    tin: data.tin,
    companyEmail: data.companyEmail.toLowerCase().trim(),
    companyPhone: data.companyPhone,
    repName: data.repName,
    repDesignation: data.repDesignation,
    repPhone: data.repPhone,
    registeredAt: new Date().toISOString(),
  }).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201 });
}
