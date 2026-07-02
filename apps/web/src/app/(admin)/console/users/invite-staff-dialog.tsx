"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const STAFF_ROLES = [
  { value: "ADMIN",        label: "Administrator" },
  { value: "TC_CHAIR",     label: "TC Chair" },
  { value: "TC_MEMBER",    label: "TC Member" },
  { value: "LAC_MEMBER",   label: "LAC Member" },
  { value: "EXCO_MEMBER",  label: "ExCo Member" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InviteStaffDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState("TC_MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  if (!open) return null;

  function handleClose() {
    setName(""); setEmail(""); setRole("TC_MEMBER");
    setError(null); setCreated(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/users/staff`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
      }
      const result = await res.json() as { email: string; tempPassword: string };
      setCreated(result);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
        <button onClick={handleClose} className="absolute right-4 top-4 text-ink-400 hover:text-ink-900" aria-label="Close">
          <X size={18} />
        </button>

        <h2 className="mb-1 text-base font-bold text-ink-900">Invite Staff Member</h2>
        <p className="mb-5 text-xs text-ink-500">
          The account is created immediately as Active. A temporary password is shown once — share it securely.
        </p>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">Account created!</p>
              <div className="space-y-1 text-xs text-green-700">
                <p><span className="font-medium">Email:</span> {created.email}</p>
                <p>
                  <span className="font-medium">Temporary password:</span>{" "}
                  <code className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-sm">{created.tempPassword}</code>
                </p>
              </div>
              <p className="mt-3 text-xs text-green-600">Copy this password — it will not be shown again.</p>
            </div>
            <Button className="w-full" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            {error && (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. James Mukasa" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="james@kip.unoc.co.ug" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  required
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create Account"}</Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
