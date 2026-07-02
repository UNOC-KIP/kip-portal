import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { homePathForRole } from "@/lib/rbac";

export default async function LaunchPage() {
  const session = await getServerSession(authOptions);
  redirect(session?.user?.role ? homePathForRole(session.user.role) : "/sign-in");
}
