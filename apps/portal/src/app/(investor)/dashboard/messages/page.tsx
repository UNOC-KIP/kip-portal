import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Inbox, Mail } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { getInbox } from "@/lib/inbox-data";
import { MessagesList } from "./messages-list";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const { messages, unreadCount } = await getInbox(userId);

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <div className="mb-6 rounded-2xl bg-black p-5 text-white sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Kabalega Industrial Park
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold">
            <Mail size={20} /> Messages
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {unreadCount > 0
              ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"} from the KIP secretariat.`
              : "Announcements and notices from the KIP secretariat."}
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-10 text-center sm:p-12">
            <Inbox size={28} className="mx-auto mb-3 text-ink-300" />
            <p className="text-sm font-semibold text-ink-900">No messages yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-ink-600">
              Announcements from the KIP secretariat — window openings, site visit notices and
              application updates — will appear here as well as by email.
            </p>
          </div>
        ) : (
          <MessagesList messages={messages} />
        )}
      </main>
    </div>
  );
}
