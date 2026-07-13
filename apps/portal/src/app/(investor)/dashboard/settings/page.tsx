import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { getInvestorProfile } from "@/lib/investor-data";
import { ProfileForm } from "./profile-form";
import { CompanyForm } from "./company-form";
import { ChangePasswordForm } from "./change-password-form";
import { SettingsCard, ReadonlyRow } from "./settings-ui";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const profile = await getInvestorProfile(userId);
  if (!profile) redirect("/dashboard");

  const needsChange = profile.passwordChangedAt == null;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
        />

        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Account settings</h1>
          <p className="text-sm text-ink-500">
            Manage your profile, company details and password.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <ProfileForm
            initial={{
              name: profile.name,
              designation: profile.designation,
              phone: profile.phone,
              email: profile.email,
            }}
          />

          {profile.org && (
            <CompanyForm
              initial={{
                legalName: profile.org.legalName,
                tradingName: profile.org.tradingName,
                registrationNumber: profile.org.registrationNumber,
                ursbRegistrationNumber: profile.org.ursbRegistrationNumber,
                companyTypeLabel: profile.org.companyTypeLabel,
                businessSectorLabel: profile.org.businessSectorLabel,
                countryOfIncorporation: profile.org.countryOfIncorporation,
                tin: profile.org.tin,
                address: profile.org.address,
                phone: profile.org.phone,
                email: profile.org.email,
              }}
            />
          )}

          <ChangePasswordForm needsChange={needsChange} />

          <SettingsCard
            icon={ShieldCheck}
            title="Account"
            description="How your account is set up on the KIP Investor Portal."
          >
            <ReadonlyRow label="Login email" value={profile.email} />
            <ReadonlyRow label="Account type" value="Investor" />
            <ReadonlyRow label="Member since" value={formatDate(profile.memberSince)} />
            <ReadonlyRow
              label="Password last changed"
              value={profile.passwordChangedAt ? formatDate(profile.passwordChangedAt) : "Never — using emailed password"}
            />
            <p className="mt-4 text-xs text-ink-500">
              Need to close your account or change your login email? Contact the KIP secretariat at{" "}
              <a
                href="mailto:kipinvestorrelations@unoc.com"
                className="font-medium text-ink-700 underline"
              >
                kipinvestorrelations@unoc.com
              </a>
              .
            </p>
          </SettingsCard>
        </div>
      </main>
    </div>
  );
}
