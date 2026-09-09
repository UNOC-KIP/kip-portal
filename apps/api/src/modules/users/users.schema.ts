import { z } from "zod";
import { BusinessSector, CompanyType, UserRole } from "@kip/shared";

// Not `.uuid()` — User.id is TEXT (NextAuth adapter) and seeded staff/investor
// accounts use slug ids like `user-gulf-investor-001`.
export const userIdParamSchema = z.object({
  id: z.string().min(1, "User ID is required").max(200),
});

export const rejectBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  designation: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email("Must be a valid email address").optional(),
  role: z.nativeEnum(UserRole).optional(),
  org: z
    .object({
      legalName: z.string().min(1).max(300).optional(),
      tradingName: z.string().max(300).nullable().optional(),
      registrationNumber: z.string().max(100).nullable().optional(),
      ursbRegistrationNumber: z.string().max(100).nullable().optional(),
      companyType: z.nativeEnum(CompanyType).nullable().optional(),
      businessSector: z.nativeEnum(BusinessSector).nullable().optional(),
      countryOfIncorporation: z.string().max(100).nullable().optional(),
      tin: z.string().max(100).nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      phone: z.string().max(50).nullable().optional(),
      email: z.string().email("Must be a valid email address").nullable().optional(),
    })
    .optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Self-service profile edit (any authenticated user, acting on themselves).
// Contact fields and the TIN are editable here (investors need to keep their TIN
// current — it's required to raise a fee invoice). The rest of the legal
// identity (legalName, registration numbers, type, sector, country) stays
// verified at registration and admin-only.
export const updateOwnProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  designation: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  org: z
    .object({
      tradingName: z.string().max(300).nullable().optional(),
      tin: z.string().max(100).nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      phone: z.string().max(50).nullable().optional(),
      email: z.string().email("Must be a valid email address").nullable().optional(),
    })
    .optional(),
});
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(200, "Password is too long"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createStaffUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  email: z.string().email("Must be a valid email address"),
  role: z.nativeEnum(UserRole).refine((r) => r !== UserRole.INVESTOR, {
    message: "Investor role cannot be assigned to staff",
  }),
});
