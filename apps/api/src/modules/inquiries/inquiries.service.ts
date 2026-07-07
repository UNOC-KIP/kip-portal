import { Inquiry } from "@kip/db";
import { InquiryStatus } from "@kip/shared";
import { NotFound } from "../../errors.js";

/**
 * Move an inquiry between follow-up states. RESPONDED / CLOSED stamp the
 * acting admin + time; reverting to NEW clears them.
 */
export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
  actorUserId: string,
): Promise<void> {
  const inquiry = await Inquiry.findByPk(inquiryId);
  if (!inquiry) throw NotFound("Inquiry");

  if (status === InquiryStatus.NEW) {
    await inquiry.update({ status, respondedById: null, respondedAt: null });
  } else {
    await inquiry.update({ status, respondedById: actorUserId, respondedAt: new Date() });
  }
}
