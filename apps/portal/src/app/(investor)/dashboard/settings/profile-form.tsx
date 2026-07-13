"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard, Field, inputClass } from "./settings-ui";

type Initial = {
  name: string;
  designation: string | null;
  phone: string | null;
  email: string;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [designation, setDesignation] = useState(initial.designation ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const dirty =
    name.trim() !== initial.name ||
    designation.trim() !== (initial.designation ?? "") ||
    phone.trim() !== (initial.phone ?? "");
  const canSave = name.trim().length > 0 && dirty && !saving;

  function onChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
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
          name: name.trim(),
          designation: designation.trim() || null,
          phone: phone.trim() || null,
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
        icon={UserRound}
        title="Your details"
        description="The authorised representative for your organisation."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" className="sm:col-span-2">
            <input
              id="name"
              value={name}
              onChange={onChange(setName)}
              className={inputClass}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Designation" htmlFor="designation" hint="e.g. Managing Director">
            <input
              id="designation"
              value={designation}
              onChange={onChange(setDesignation)}
              className={inputClass}
              placeholder="Managing Director"
            />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <input
              id="phone"
              value={phone}
              onChange={onChange(setPhone)}
              className={inputClass}
              placeholder="+256 700 000000"
            />
          </Field>
          <Field
            label="Login email"
            htmlFor="email"
            hint="This is your sign-in address. Contact the secretariat to change it."
            className="sm:col-span-2"
          >
            <input id="email" value={initial.email} disabled className={inputClass} />
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
      </SettingsCard>
    </form>
  );
}
