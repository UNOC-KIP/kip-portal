import crypto from "crypto";
import { hash } from "bcryptjs";
import { sequelize, User, InvestorOrg } from "@kip/db";
import { UserStatus } from "@kip/shared";
import { Conflict, NotFound } from "../../errors.js";
import { fireWebhook } from "../../webhooks.js";

function generatePassword(): string {
  return crypto.randomBytes(20).toString("base64url").slice(0, 20);
}

export async function approveUser(userId: string): Promise<void> {
  const user = await User.findByPk(userId, {
    include: [{ model: InvestorOrg, as: "investorOrg" }],
  });
  if (!user) throw NotFound("User");

  if (user.status !== UserStatus.PENDING_REVIEW) {
    throw Conflict(`Cannot approve a user with status ${user.status}`);
  }

  const plainPassword = generatePassword();
  const passwordHash = await hash(plainPassword, 12);

  await sequelize.transaction(async (t) => {
    await user.update(
      { status: UserStatus.ACTIVE, passwordHash },
      { transaction: t },
    );
  });

  const org = (user as User & { investorOrg?: InvestorOrg }).investorOrg;

  await fireWebhook("investor-approved", {
    userId: user.id,
    email: user.email,
    companyName: org?.legalName ?? "",
    generatedPassword: plainPassword,
  });
}

export async function rejectUser(
  userId: string,
  reason?: string,
): Promise<void> {
  const user = await User.findByPk(userId, {
    include: [{ model: InvestorOrg, as: "investorOrg" }],
  });
  if (!user) throw NotFound("User");

  if (user.status !== UserStatus.PENDING_REVIEW) {
    throw Conflict(`Cannot reject a user with status ${user.status}`);
  }

  await sequelize.transaction(async (t) => {
    await user.update({ status: UserStatus.REJECTED }, { transaction: t });
  });

  const org = (user as User & { investorOrg?: InvestorOrg }).investorOrg;

  await fireWebhook("investor-rejected", {
    userId: user.id,
    email: user.email,
    companyName: org?.legalName ?? "",
    reason: reason ?? null,
  });
}
