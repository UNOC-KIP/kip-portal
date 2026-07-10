"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { COMPANY_TYPE_LABELS, BUSINESS_SECTOR_LABELS, UserRole } from "@kip/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const STAFF_ROLES = [
  { value: "ADMIN",       label: "Administrator" },
  { value: "TC_CHAIR",    label: "TC Chair" },
  { value: "TC_MEMBER",   label: "TC Member" },
  { value: "LAC_MEMBER",  label: "LAC Member" },
  { value: "EXCO_MEMBER", label: "ExCo Member" },
] as const;

export type UserEditData = {
  name: string;
  designation: string;
  phone: string;
  email: string;
  role: string;
  hasOrg: boolean;
  org: {
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
};

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  initial: UserEditData;
}

export function EditUserDialog({ open, onClose, userId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<UserEditData>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isStaff = initial.role !== UserRole.INVESTOR;

  function set<K extends keyof UserEditData>(key: K, value: UserEditData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setOrg<K extends keyof UserEditData["org"]>(key: K, value: string) {
    setForm((f) => ({ ...f, org: { ...f.org, [key]: value } }));
  }

  function handleClose() {
    setForm(initial);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      name: form.name,
      designation: form.designation || null,
      phone: form.phone || null,
      email: form.email,
    };
    if (isStaff && form.role !== initial.role) body.role = form.role;
    if (form.hasOrg) {
      body.org = {
        ...(form.org.legalName ? { legalName: form.org.legalName } : {}),
        tradingName: form.org.tradingName || null,
        registrationNumber: form.org.registrationNumber || null,
        ursbRegistrationNumber: form.org.ursbRegistrationNumber || null,
        companyType: form.org.companyType || null,
        businessSector: form.org.businessSector || null,
        countryOfIncorporation: form.org.countryOfIncorporation || null,
        tin: form.org.tin || null,
        address: form.org.address || null,
        phone: form.org.phone || null,
        email: form.org.email || null,
      };
    }

    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
        <button onClick={handleClose} className="absolute right-4 top-4 text-ink-400 hover:text-ink-900" aria-label="Close">
          <X size={18} />
        </button>

        <h2 className="mb-1 text-base font-bold text-ink-900">Edit {isStaff ? "Staff Member" : "Investor Account"}</h2>
        <p className="mb-5 text-xs text-ink-500">
          Changes take effect immediately. The email address is the account&apos;s login.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-widest text-ink-400">
              {isStaff ? "Account" : "Authorized Representative"}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </Field>
              <Field label="Email (login)">
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </Field>
              <Field label="Designation / Title">
                <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              {isStaff && (
                <Field label="Role">
                  <select
                    value={form.role}
                    onChange={(e) => set("role", e.target.value)}
                    className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </fieldset>

          {form.hasOrg && (
            <fieldset className="space-y-4">
              <legend className="text-xs font-bold uppercase tracking-widest text-ink-400">
                Company Information
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Legal Name">
                  <Input value={form.org.legalName} onChange={(e) => setOrg("legalName", e.target.value)} required />
                </Field>
                <Field label="Trading Name">
                  <Input value={form.org.tradingName} onChange={(e) => setOrg("tradingName", e.target.value)} />
                </Field>
                <Field label="Registration No.">
                  <Input value={form.org.registrationNumber} onChange={(e) => setOrg("registrationNumber", e.target.value)} />
                </Field>
                <Field label="URSB Registration No.">
                  <Input value={form.org.ursbRegistrationNumber} onChange={(e) => setOrg("ursbRegistrationNumber", e.target.value)} />
                </Field>
                <Field label="Company Type">
                  <select
                    value={form.org.companyType}
                    onChange={(e) => setOrg("companyType", e.target.value)}
                    className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="">—</option>
                    {Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Primary Sector">
                  <select
                    value={form.org.businessSector}
                    onChange={(e) => setOrg("businessSector", e.target.value)}
                    className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="">—</option>
                    {Object.entries(BUSINESS_SECTOR_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="TIN">
                  <Input value={form.org.tin} onChange={(e) => setOrg("tin", e.target.value)} />
                </Field>
                <Field label="Country of Incorporation">
                  <Input value={form.org.countryOfIncorporation} onChange={(e) => setOrg("countryOfIncorporation", e.target.value)} />
                </Field>
                <Field label="Company Phone">
                  <Input value={form.org.phone} onChange={(e) => setOrg("phone", e.target.value)} />
                </Field>
                <Field label="Company Email">
                  <Input type="email" value={form.org.email} onChange={(e) => setOrg("email", e.target.value)} />
                </Field>
              </div>
              <Field label="Registered Address">
                <Input value={form.org.address} onChange={(e) => setOrg("address", e.target.value)} />
              </Field>
            </fieldset>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-ink-700">{label}</label>
      {children}
    </div>
  );
}
