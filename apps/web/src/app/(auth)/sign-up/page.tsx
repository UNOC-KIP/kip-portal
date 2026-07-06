import { redirect } from "next/navigation";

// Investor registration lives in the investor portal — the two-step wizard
// posts to the portal's /api/register. This app (admin) has no register API.
export default function SignUpPage() {
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:4002";
  redirect(`${portalUrl}/sign-up`);
}
