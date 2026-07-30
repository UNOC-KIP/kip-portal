import "server-only";
import { Notification } from "@kip/db";
import { CommunicationChannel, bodyExcerpt, longDate } from "@kip/shared";

export type InboxMessage = {
  id: string;
  subject: string;
  /** Raw body, already merge-resolved for this recipient at send time. */
  body: string;
  excerpt: string;
  receivedAt: string;
  isUnread: boolean;
};

export type InboxData = {
  messages: InboxMessage[];
  unreadCount: number;
};

/**
 * The investor's portal inbox — the `Notification` rows written when an admin
 * sends a broadcast.
 *
 * Only channels that include the portal are shown: an email-only broadcast still
 * writes a delivery row (that's the send log), but it was never meant to appear
 * here. `body` is stored already merge-rendered per recipient, so this matches
 * the email they received word for word.
 */
export async function getInbox(userId: string): Promise<InboxData> {
  let rows: Notification[];
  try {
    rows = await Notification.findAll({
      where: {
        userId,
        channel: [CommunicationChannel.IN_APP, CommunicationChannel.EMAIL_AND_IN_APP],
      },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
  } catch {
    // Same defensive posture as `getTimelineData()` — a dashboard must still
    // render if this read fails.
    return { messages: [], unreadCount: 0 };
  }

  const messages = rows.map((n) => ({
    id: n.id,
    subject: n.subject,
    body: n.body,
    excerpt: bodyExcerpt(n.body, 140),
    receivedAt: longDate(n.createdAt),
    isUnread: n.readAt === null,
  }));

  return {
    messages,
    unreadCount: messages.filter((m) => m.isUnread).length,
  };
}

/** Unread count only — for the sidebar badge and the dashboard nudge. */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await Notification.count({
      where: {
        userId,
        readAt: null,
        channel: [CommunicationChannel.IN_APP, CommunicationChannel.EMAIL_AND_IN_APP],
      },
    });
  } catch {
    return 0;
  }
}
