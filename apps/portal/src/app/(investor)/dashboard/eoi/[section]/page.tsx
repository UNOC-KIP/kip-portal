"use client";

import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const SECTIONS = [
  { num: 1, label: "Preliminary Info",  sub: "Company · Contacts · POA" },
  { num: 2, label: "Land Profile",      sub: "Area · Evidence" },
  { num: 3, label: "Utilities",         sub: "Water · Power · ICT" },
  { num: 4, label: "H3SE",              sub: "Track record · System" },
  { num: 5, label: "National Content",  sub: "Ugandan nationals" },
  { num: 6, label: "Declaration",       sub: "Signature · Submit" },
];

const LAND_CATEGORIES = ["Light Industry", "Heavy Industry", "Commercial", "Mixed Use", "Logistics"];

function UploadBox({ label, uploaded }: { label: string; uploaded?: boolean }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition",
        uploaded
          ? "border-brand-400 bg-brand-50"
          : "border-dashed border-ink-300 hover:border-brand-400",
      )}
    >
      <span className={`text-lg ${uploaded ? "text-brand-600" : "text-ink-400"}`}>
        {uploaded ? "📄" : "➕"}
      </span>
      <div>
        <p className={`text-sm font-semibold ${uploaded ? "text-brand-700" : "text-ink-700"}`}>
          {label}
        </p>
        <p className="text-xs text-ink-500">{uploaded ? "Uploaded" : "Click to upload"}</p>
      </div>
      <input type="file" className="sr-only" />
    </label>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required && " *"}
      </label>
      {children}
    </div>
  );
}

function Section1() {
  return (
    <div className="space-y-5">
      <FormField label="Registered Company Name" required>
        <Input defaultValue="Nile Industries Limited" />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Country of Registration" required>
          <Input defaultValue="Uganda" />
        </FormField>
        <FormField label="TIN Number" required>
          <Input placeholder="1000234567" />
        </FormField>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Year of Incorporation" required>
          <Input placeholder="2010" />
        </FormField>
        <FormField label="Registered Address" required>
          <Input placeholder="Plot 15, Kampala Road" />
        </FormField>
      </div>
      <FormField label="Primary Contact Phone">
        <Input placeholder="+256 414 700 001" />
      </FormField>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink-700">Required Documents</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UploadBox label="Certificate of Incorporation" uploaded />
          <UploadBox label="Power of Attorney" uploaded />
          <UploadBox label="Shareholder IDs" />
          <UploadBox label="Company Organogram" />
        </div>
      </div>
    </div>
  );
}

function Section2() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Land Area Required (ha)" required>
          <Input defaultValue="3.5" />
        </FormField>
        <FormField label="Land Category" required>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {LAND_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Proposed Business Activity" required>
        <textarea
          rows={3}
          defaultValue="Manufacturing and assembly of industrial process equipment for the oil and gas sector, including pipeline components, pressure vessels, and instrumentation systems."
          className="flex min-h-[72px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </FormField>
      <FormField label="Capital Investment Plan (USD)" required>
        <Input defaultValue="4,200,000" />
      </FormField>
      <FormField label="Planned Employment (Year 1 / Year 3)" required>
        <Input placeholder="45 direct / 120 direct" />
      </FormField>
      <div>
        <label className="mb-3 block text-sm font-medium">Evidence of Similar Projects</label>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 py-6 transition hover:border-brand-500">
          <span className="mb-2 text-xl">⬆️</span>
          <p className="text-sm font-semibold">Upload evidence documents — max 3 files, 10 MB each</p>
          <p className="mt-1 text-xs text-green-600">Nairobi_Facility_Profile.pdf – 2.1 MB ✓</p>
          <input type="file" className="sr-only" multiple />
        </label>
      </div>
    </div>
  );
}

function Section3() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Daily Water Requirement (m³/day)" required>
          <Input placeholder="120" />
        </FormField>
        <FormField label="Peak Power Demand (MW)" required>
          <Input placeholder="1.2" />
        </FormField>
      </div>
      <FormField label="Primary Power Connection" required>
        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          {["Grid only", "Solar only", "Grid + Solar backup", "Hybrid (Grid + Generator)"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </FormField>
      <FormField label="ICT / Internet Bandwidth Required (Mbps)" required>
        <Input placeholder="100" />
      </FormField>
      <FormField label="Wastewater / Effluent Management">
        <textarea
          rows={2}
          placeholder="Describe your on-site treatment approach…"
          className="flex min-h-[60px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </FormField>
    </div>
  );
}

function Section4() {
  return (
    <div className="space-y-5">
      <FormField label="Environmental Certifications" required>
        <Input placeholder="e.g. ISO 14001:2015" />
      </FormField>
      <FormField label="H3SE Management System Description" required>
        <textarea
          rows={4}
          placeholder="Describe your health, safety, security, and environment management system…"
          className="flex min-h-[96px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </FormField>
      <FormField label="Emergency Response Procedures">
        <textarea
          rows={3}
          placeholder="Outline your emergency response and evacuation procedures for KIP scale operations…"
          className="flex min-h-[72px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </FormField>
      <div>
        <label className="mb-3 block text-sm font-medium">H3SE Evidence Documents</label>
        <UploadBox label="H3SE Policy Document" />
      </div>
    </div>
  );
}

function Section5() {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Ugandan Workforce Percentage (Year 1) *</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} defaultValue={68} className="flex-1 accent-brand-500" />
          <span className="w-12 text-right font-bold">68%</span>
        </div>
      </div>
      <FormField label="Apprenticeship / Training Programme" required>
        <textarea
          rows={3}
          defaultValue="Apprenticeship programme with Makerere University. 5-year skills transfer schedule included."
          className="flex min-h-[72px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </FormField>
      <FormField label="Local Procurement Commitment (%)">
        <Input placeholder="e.g. 40% of raw materials sourced locally" />
      </FormField>
      <FormField label="Community Development Initiatives">
        <textarea
          rows={3}
          placeholder="Describe planned community engagement or CSR activities…"
          className="flex min-h-[72px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </FormField>
    </div>
  );
}

function Section6({ onSubmit }: { onSubmit: () => void }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">
        I certify that all information provided in this Expression of Interest application is
        true, accurate, and complete to the best of my knowledge. I understand that any false
        or misleading information may result in disqualification. I acknowledge that the USD
        1,000 application fee is non-refundable.
      </div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 accent-brand-500"
        />
        <span className="text-sm text-ink-700">
          I confirm the above declaration and accept the{" "}
          <Link href="/terms" className="font-semibold underline text-brand-600">
            UNOC Land Allocation Policy
          </Link>
          .
        </span>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Authorised Signatory Name" required>
          <Input placeholder="Full legal name" />
        </FormField>
        <FormField label="Designation / Title" required>
          <Input placeholder="e.g. Chief Executive Officer" />
        </FormField>
      </div>
      <FormField label="Date" required>
        <Input type="date" />
      </FormField>
      <Button
        onClick={onSubmit}
        disabled={!agreed}
        className="w-full bg-green-600 py-6 hover:bg-green-700"
      >
        Submit EOI Application →
      </Button>
    </div>
  );
}

const SECTION_SUBTITLES: Record<number, string> = {
  1: "Provide your company registration details, authorised representatives, and contact information.",
  2: "Specify exact land area required, land category preference, and evidence of similar projects.",
  3: "Detail your operational utility requirements for water, power, and ICT connectivity.",
  4: "Demonstrate your Health, Safety, Security and Environment management capabilities.",
  5: "Outline your commitment to Ugandan workforce and local content development.",
  6: "Review and submit your complete EOI application.",
};

export default function EoiSectionPage() {
  const params = useParams();
  const router = useRouter();
  const raw = Array.isArray(params.section) ? params.section[0] : params.section;
  const current = Math.min(Math.max(parseInt(raw ?? "1", 10), 1), 6);

  function goNext() {
    if (current < 6) router.push(`/dashboard/eoi/${current + 1}`);
  }
  function goPrev() {
    if (current > 1) router.push(`/dashboard/eoi/${current - 1}`);
    else router.push("/dashboard");
  }
  function handleSubmit() {
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "EOI Wizard" },
          ]}
        />

        <div className="flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white lg:flex-row">
          {/* Left step nav */}
          <div
            className="shrink-0 p-5 lg:w-60 lg:p-6"
            style={{ backgroundColor: "#EAB308" }}
          >
            <h2 className="mb-1 text-base font-bold text-black">EOI Application</h2>
            <p className="mb-5 text-xs text-black/60">6 sections. save anytime</p>
            <ol className="flex flex-row flex-wrap gap-1 lg:flex-col lg:space-y-0.5">
              {SECTIONS.map((s) => {
                const isActive = s.num === current;
                const isDone = s.num < current;
                return (
                  <li key={s.num}>
                    <Link
                      href={`/dashboard/eoi/${s.num}`}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-3 py-2 transition",
                        isActive ? "bg-black/15" : "hover:bg-black/10",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 text-base",
                          isDone || isActive ? "text-black" : "text-black/40",
                        )}
                      >
                        {isDone ? "◼" : isActive ? "◼" : "◻"}
                      </span>
                      <div className="hidden lg:block">
                        <p
                          className={cn(
                            "text-sm font-bold",
                            isActive ? "text-black" : isDone ? "text-black/70" : "text-black/50",
                          )}
                        >
                          {s.label}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            isActive ? "text-black/60" : "text-black/40",
                          )}
                        >
                          {s.sub}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-black lg:hidden">
                        {s.num}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Right form */}
          <div className="flex-1 p-5 sm:p-8">
            <h1 className="mb-1 text-xl font-bold sm:text-2xl">
              Section {current} — {SECTIONS[current - 1]?.label}
            </h1>
            <p className="mb-6 text-sm text-ink-500">{SECTION_SUBTITLES[current]}</p>

            {current === 1 && <Section1 />}
            {current === 2 && <Section2 />}
            {current === 3 && <Section3 />}
            {current === 4 && <Section4 />}
            {current === 5 && <Section5 />}
            {current === 6 && <Section6 onSubmit={handleSubmit} />}

            {current < 6 && (
              <div className="mt-8 flex flex-col-reverse items-start justify-between gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:items-center">
                <Button variant="outline" onClick={goPrev}>
                  Previous
                </Button>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">Save &amp; Exit</Link>
                  </Button>
                  <Button onClick={goNext}>Save &amp; continue</Button>
                </div>
              </div>
            )}
            {current === 6 && (
              <div className="mt-4 border-t border-ink-200 pt-6">
                <Button variant="outline" onClick={goPrev}>
                  Previous
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
