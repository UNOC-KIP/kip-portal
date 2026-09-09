"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard, Field, ReadonlyRow, inputClass } from "./settings-ui";

export type CompanyInitial = {
  legalName: string;
  tradingName: string | null;
  registrationNumber: string | null;
  ursbRegistrationNumber: string | null;
  companyTypeLabel: string | null;
  businessSectorLabel: string | null;
  countryOfIncorporation: string | null;
  tin: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export function CompanyForm({ initial }: { initial: CompanyInitial }) {
  const router = useRouter();
  const [tradingName, setTradingName] = useState(initial.tradingName ?? "");
  const [tin, setTin] = useState(initial.tin ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const dirty =
    tradingName.trim() !== (initial.tradingName ?? "") ||
    tin.trim() !== (initial.tin ?? "") ||
    address.trim() !== (initial.address ?? "") ||
    phone.trim() !== (initial.phone ?? "") ||
    email.trim() !== (initial.email ?? "");
  const canSave = dirty && !saving;

  function onChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setSaved(false);
      setError("");
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          org: {
            tradingName: tradingName.trim() || null,
            tin: tin.trim() || null,
            address: address.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d?.error?.message ?? "We couldn't save your changes. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <SettingsCard
        icon={Building2}
        title="Company profile"
        description="Contact details are yours to edit. Legal identity is verified — contact the secretariat to amend it."
      >
        {/* Editable contact block */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Trading name" htmlFor="tradingName" className="sm:col-span-2">
            <input
              id="tradingName"
              value={tradingName}
              onChange={onChange(setTradingName)}
              className={inputClass}
              placeholder="Optional"
            />
          </Field>
          <Field label="TIN" htmlFor="tin" className="sm:col-span-2">
            <input
              id="tin"
              value={tin}
              onChange={onChange(setTin)}
              className={inputClass}
              placeholder="Tax Identification Number"
            />
            <p className="mt-1 text-xs text-ink-500">
              Required to generate your application-fee invoice.
            </p>
          </Field>
          <Field label="Company phone" htmlFor="orgPhone">
            <input
              id="orgPhone"
              value={phone}
              onChange={onChange(setPhone)}
              className={inputClass}
              placeholder="+256 700 000000"
            />
          </Field>
          <Field label="Company email" htmlFor="orgEmail">
            <input
              id="orgEmail"
              type="email"
              value={email}
              onChange={onChange(setEmail)}
              className={inputClass}
              placeholder="info@company.com"
            />
          </Field>
          <Field label="Registered address" htmlFor="address" className="sm:col-span-2">
            <textarea
              id="address"
              rows={2}
              value={address}
              onChange={onChange(setAddress)}
              className={inputClass}
              placeholder="Plot, street, city, country"
            />
          </Field>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={!canSave}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {saved && !dirty && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
        </div>

        {/* Read-only legal identity */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-ink-100/50 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
            <Lock size={12} /> Verified legal details
          </div>
          <ReadonlyRow label="Legal name" value={initial.legalName} />
          <ReadonlyRow label="Company type" value={initial.companyTypeLabel} />
          <ReadonlyRow label="Business sector" value={initial.businessSectorLabel} />
          <ReadonlyRow label="Country of incorporation" value={initial.countryOfIncorporation} />
          <ReadonlyRow label="Registration number" value={initial.registrationNumber} />
          <ReadonlyRow label="URSB number" value={initial.ursbRegistrationNumber} />
        </div>
      </SettingsCard>
    </form>
  );
}
