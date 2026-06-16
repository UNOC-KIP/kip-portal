import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { homePathForRole } from "@/lib/rbac";

/**
 * Post-login landing. Sign-in sends every user here; we read the session
 * server-side and forward to the correct home for their role. Single source of
 * truth for "where do I go after authenticating".
 */
export default async function LaunchPage() {
  const session = await getServerSession(authOptions);
  redirect(session?.user?.role ? homePathForRole(session.user.role) : "/sign-in");
}
