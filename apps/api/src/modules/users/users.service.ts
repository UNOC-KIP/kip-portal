import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Op, type Transaction } from "sequelize";
import {
  sequelize,
  User,
  InvestorOrg,
  Application,
  Payment,
  Account,
  Session,
} from "@kip/db";
import { UserRole, UserStatus } from "@kip/shared";
import { BadRequest, Conflict, NotFound } from "../../errors.js";
import type { UpdateUserInput } from "./users.schema.js";
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

/**
 * Admin edit of an account: representative/staff fields on User plus, for
 * investors, the linked InvestorOrg company profile. Role changes are staff →
 * staff only — INVESTOR accounts are tied to an org and cannot switch kind.
 */
export async function updateUser(userId: string, input: UpdateUserInput): Promise<void> {
  await sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { lock: true, transaction: t });
    if (!user) throw NotFound("User");

    if (input.email && input.email !== user.email) {
      // paranoid: false — a soft-deleted account still owns its email (unique index).
      const taken = await User.findOne({
        where: { email: input.email },
        paranoid: false,
        transaction: t,
      });
      if (taken) throw Conflict(`A user with email ${input.email} already exists`);
    }

    if (input.role && input.role !== user.role) {
      if (user.role === UserRole.INVESTOR || input.role === UserRole.INVESTOR) {
        throw BadRequest("Role can only be changed between staff roles");
      }
    }

    await user.update(
      {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.designation !== undefined ? { designation: input.designation } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
      },
      { transaction: t },
    );

    if (input.org) {
      if (!user.investorOrgId) {
        throw BadRequest("User has no investor organisation to update");
      }
      const org = await InvestorOrg.findByPk(user.investorOrgId, { transaction: t });
      if (!org) throw NotFound("Investor organisation");
      await org.update(input.org, { transaction: t });
    }
  });
}

/**
 * Admin soft delete of an account (paranoid mode — recoverable in SQL).
 * Cascades to the user's applications + their payments, hard-deletes auth
 * sessions, and removes the investor org if no other account references it.
 */
export async function deleteUser(userId: string, actor: { id: string }): Promise<void> {
  if (userId === actor.id) {
    throw BadRequest("You cannot delete your own account");
  }

  await sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { lock: true, transaction: t });
    if (!user) throw NotFound("User");

    if (user.role === UserRole.ADMIN) {
      const otherAdmins = await User.count({
        where: { role: UserRole.ADMIN, id: { [Op.ne]: user.id } },
        transaction: t,
      });
      if (otherAdmins === 0) throw Conflict("Cannot delete the last admin account");
    }

    const apps = await Application.findAll({
      where: { ownerUserId: user.id },
      attributes: ["id"],
      transaction: t,
    });
    const appIds = apps.map((a) => a.id);
    if (appIds.length > 0) {
      await Payment.destroy({ where: { applicationId: appIds }, transaction: t });
      await Application.destroy({ where: { id: appIds }, transaction: t });
    }

    // Auth artifacts are not paranoid — remove them outright so no live
    // session survives the account.
    await Session.destroy({ where: { userId: user.id }, transaction: t });
    await Account.destroy({ where: { userId: user.id }, transaction: t });

    const orgId = user.investorOrgId;
    await user.destroy({ transaction: t });

    if (orgId) {
      const remaining = await User.count({ where: { investorOrgId: orgId }, transaction: t });
      if (remaining === 0) {
        await InvestorOrg.destroy({ where: { id: orgId }, transaction: t });
      }
    }
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
