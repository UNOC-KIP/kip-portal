import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";

/**
 * Neutral "no access" notice. Shown to authenticated users whose role has no
 * workspace assigned yet (e.g. LAC / ExCo reviewers — their screens arrive in
 * Phase 3) or who hit a page above their permissions. Renders NO sensitive
 * data by design.
 */
export default async function UnauthorizedPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 px-6">
      <div className="w-full max-w-md rounded-xl border border-ink-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <ShieldAlert className="text-amber-600" size={24} />
        </div>
        <h1 className="text-lg font-bold text-ink-900">No workspace assigned</h1>
        <p className="mt-2 text-sm text-ink-500">
          {role
            ? `Your account role (${role}) doesn't have access to this area yet. If you believe this is a mistake, contact the KIP administrator.`
            : "You don't have access to this area. Please sign in with an authorised account."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/api/auth/signout"
            className="rounded-md border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100"
          >
            Sign out
          </Link>
        </div>
      </div>
    </div>
  );
}
