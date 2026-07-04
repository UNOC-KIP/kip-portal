import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Transaction } from "sequelize";
import { sequelize, User, InvestorOrg } from "@kip/db";
import { UserStatus } from "@kip/shared";
import { Conflict, NotFound } from "../../errors.js";
import { fireWebhook } from "../../webhooks.js";
import { sendMail, credentialsEmail, rejectionEmail } from "../../mailer.js";
import { env } from "../../env.js";

export async function createStaffUser(input: {
  name: string;
  email: string;
  role: string;
}): Promise<{ id: string; email: string; role: string; tempPassword: string }> {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw Conflict(`A user with email ${input.email} already exists`);

  const tempPassword = generatePassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await User.create({
    name: input.name,
    email: input.email,
    role: input.role,
    status: UserStatus.ACTIVE,
    passwordHash,
  });

  await fireWebhook("staff-invited", {
    userId: user.id,
    email: user.email,
    name: input.name,
    role: input.role,
    tempPassword,
  });

  return { id: user.id, email: user.email, role: user.role, tempPassword };
}

function generatePassword(): string {
  return crypto.randomBytes(20).toString("base64url").slice(0, 20);
}

// Fetches the user inside an open transaction with a row-level lock (SELECT FOR
// UPDATE) and verifies the status is PENDING_REVIEW. Throws before any mutation
// so a concurrent request blocks on the lock and then sees the committed status,
// preventing double-approve / double-reject races.
async function fetchPendingInvestorForUpdate(
  userId: string,
  action: string,
  t: Transaction,
): Promise<{ user: User; org: InvestorOrg | undefined }> {
  const user = await User.findByPk(userId, {
    include: [{ model: InvestorOrg, as: "investorOrg" }],
    lock: true,
    transaction: t,
  });
  if (!user) throw NotFound("User");
  if (user.status !== UserStatus.PENDING_REVIEW) {
    throw Conflict(`Cannot ${action} a user with status ${user.status}`);
  }
  return {
    user,
    org: (user as User & { investorOrg?: InvestorOrg }).investorOrg,
  };
}

export async function approveUser(userId: string): Promise<void> {
  const plainPassword = generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  let capturedEmail = "";
  let capturedOrg: InvestorOrg | undefined;

  await sequelize.transaction(async (t) => {
    const { user, org } = await fetchPendingInvestorForUpdate(userId, "approve", t);
    await user.update({ status: UserStatus.ACTIVE, passwordHash }, { transaction: t });
    capturedEmail = user.email;
    capturedOrg = org;
  });

  try {
    await sendMail({
      to: capturedEmail,
      subject: "Your KIP Investor Portal account is ready",
      html: credentialsEmail({
        companyName: capturedOrg?.legalName ?? capturedEmail,
        email: capturedEmail,
        tempPassword: plainPassword,
        portalUrl: env.PORTAL_PUBLIC_URL,
      }),
    });
  } catch {
    // Log already captured inside sendMail — don't block the approval.
  }

  await fireWebhook("investor-approved", {
    userId,
    email: capturedEmail,
    companyName: capturedOrg?.legalName ?? "",
    generatedPassword: plainPassword,
  });
}

export async function rejectUser(
  userId: string,
  reason?: string,
): Promise<void> {
  let capturedEmail = "";
  let capturedOrg: InvestorOrg | undefined;

  await sequelize.transaction(async (t) => {
    const { user, org } = await fetchPendingInvestorForUpdate(userId, "reject", t);
    await user.update({ status: UserStatus.REJECTED }, { transaction: t });
    capturedEmail = user.email;
    capturedOrg = org;
  });

  try {
    await sendMail({
      to: capturedEmail,
      subject: "Update on your KIP Investor Portal registration",
      html: rejectionEmail({ companyName: capturedOrg?.legalName ?? capturedEmail, reason }),
    });
  } catch {
    // Log already captured inside sendMail — don't block the rejection.
  }

  await fireWebhook("investor-rejected", {
    userId,
    email: capturedEmail,
    companyName: capturedOrg?.legalName ?? "",
    reason: reason ?? null,
  });
}
