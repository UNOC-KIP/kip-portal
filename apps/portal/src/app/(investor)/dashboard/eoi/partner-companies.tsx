"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { COMPANY_TYPE_LABELS, BUSINESS_SECTOR_LABELS } from "@kip/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EoiPartner } from "@/lib/eoi-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

type PartnerForm = {
  id?: string; // existing row id — kept so a saved partner keeps its documents
  key: string; // stable local key for React lists
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  ursbRegistrationNumber: string;
  companyType: string;
  businessSector: string;
  countryOfIncorporation: string;
  tin: string;
  address: string;
  phone: string;
  email: string;
};

let seq = 0;
function blankPartner(): PartnerForm {
  seq += 1;
  return {
    key: `new-${seq}`,
    legalName: "",
    tradingName: "",
    registrationNumber: "",
    ursbRegistrationNumber: "",
    companyType: "",
    businessSector: "",
    countryOfIncorporation: "",
    tin: "",
    address: "",
    phone: "",
    email: "",
  };
}

function fromPartner(p: EoiPartner): PartnerForm {
  return {
    id: p.id,
    key: p.id,
    legalName: p.legalName,
    tradingName: p.tradingName ?? "",
    registrationNumber: p.registrationNumber ?? "",
    ursbRegistrationNumber: p.ursbRegistrationNumber ?? "",
    companyType: p.companyType ?? "",
    businessSector: p.businessSector ?? "",
    countryOfIncorporation: p.countryOfIncorporation ?? "",
    tin: p.tin ?? "",
    address: p.address ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
  };
}

/**
 * Captures the other companies in a joint-venture application. The primary
 * applicant company is already collected in Section 1 (Legal Status); this adds
 * each co-venturer with the same business-profile fields, saved as a set to
 * PUT /applications/:id/partners. Only shown when the applicant's legal form is
 * a joint venture.
 */
export function PartnerCompanies({
  applicationId,
  initial,
  disabled,
}: {
  applicationId: string;
  initial: EoiPartner[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerForm[]>(() =>
    initial.length ? initial.map(fromPartner) : [blankPartner()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(key: string, field: keyof PartnerForm, value: string) {
    setPartners((ps) => ps.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
    setSaved(false);
  }
  function addPartner() {
    setPartners((ps) => [...ps, blankPartner()]);
    setSaved(false);
  }
  function removePartner(key: string) {
    setPartners((ps) => ps.filter((p) => p.key !== key));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const body = {
      partners: partners.map((p) => ({
        ...(p.id ? { id: p.id } : {}),
        legalName: p.legalName.trim(),
        tradingName: p.tradingName || null,
        registrationNumber: p.registrationNumber || null,
        ursbRegistrationNumber: p.ursbRegistrationNumber || null,
        companyType: p.companyType || null,
        businessSector: p.businessSector || null,
        countryOfIncorporation: p.countryOfIncorporation || null,
        tin: p.tin || null,
        address: p.address || null,
        phone: p.phone || null,
        email: p.email || null,
      })),
    };
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/partners`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(d?.error?.message ?? "Could not save the venture partners");
      }
      const { partners: rows } = (await res.json()) as { partners: EoiPartner[] };
      // Adopt the server rows so new partners pick up their id for the next save.
      setPartners(rows.length ? rows.map(fromPartner) : [blankPartner()]);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the venture partners");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5">
      <div className="mb-1 flex items-center gap-2">
        <Building2 size={16} className="text-brand-600" />
        <h3 className="text-sm font-bold text-ink-900">Joint-Venture Partners</h3>
      </div>
      <p className="mb-4 text-xs text-ink-500">
        Your application is a joint venture, so give the details of the other companies in
        the venture. Enter each company&apos;s business and incorporation details — the same
        information collected for the primary applicant in Section 1.
      </p>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {partners.map((p, index) => (
          <div key={p.key} className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-400">
                Venture {index + 1}
              </span>
              {!disabled && partners.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePartner(p.key)}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Legal name" required>
                <Input value={p.legalName} disabled={disabled} onChange={(e) => update(p.key, "legalName", e.target.value)} />
              </Field>
              <Field label="Trading name">
                <Input value={p.tradingName} disabled={disabled} onChange={(e) => update(p.key, "tradingName", e.target.value)} />
              </Field>
              <Field label="Registration number">
                <Input value={p.registrationNumber} disabled={disabled} onChange={(e) => update(p.key, "registrationNumber", e.target.value)} />
              </Field>
              <Field label="URSB registration number">
                <Input value={p.ursbRegistrationNumber} disabled={disabled} onChange={(e) => update(p.key, "ursbRegistrationNumber", e.target.value)} />
              </Field>
              <Field label="Company type">
                <Select value={p.companyType} disabled={disabled} onChange={(e) => update(p.key, "companyType", e.target.value)} options={COMPANY_TYPE_LABELS} />
              </Field>
              <Field label="Primary sector">
                <Select value={p.businessSector} disabled={disabled} onChange={(e) => update(p.key, "businessSector", e.target.value)} options={BUSINESS_SECTOR_LABELS} />
              </Field>
              <Field label="Country of incorporation">
                <Input value={p.countryOfIncorporation} disabled={disabled} onChange={(e) => update(p.key, "countryOfIncorporation", e.target.value)} />
              </Field>
              <Field label="TIN">
                <Input value={p.tin} disabled={disabled} onChange={(e) => update(p.key, "tin", e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={p.phone} disabled={disabled} onChange={(e) => update(p.key, "phone", e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={p.email} disabled={disabled} onChange={(e) => update(p.key, "email", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Registered address">
                  <Input value={p.address} disabled={disabled} onChange={(e) => update(p.key, "address", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addPartner} disabled={saving}>
            <Plus size={14} className="mr-1.5" /> Add another venture
          </Button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <Check size={13} /> Saved
              </span>
            )}
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save venture partners"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">—</option>
      {Object.entries(options).map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
