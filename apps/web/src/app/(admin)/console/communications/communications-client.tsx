"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Megaphone, PenLine, Send, Users } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import type { CommunicationsView } from "@/lib/admin/queries";
import { ComposeForm } from "./compose-form";
import { TemplatesTab } from "./templates-tab";

type Tab = "compose" | "history" | "templates";

export function CommunicationsClient({ view }: { view: CommunicationsView }) {
  const [tab, setTab] = useState<Tab>("compose");

  const tabs: [Tab, string][] = [
    ["compose", "Compose"],
    ["history", `History (${view.communications.length})`],
    ["templates", `Templates (${view.templates.length})`],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[{ label: "Dashboard", href: "/console" }, { label: "Communications" }]}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Sent This Month"
            value={view.stats.sentThisMonth}
            subtext="Broadcasts started"
            icon={Send}
          />
          <StatCard
            label="Recipients Reached"
            value={view.stats.recipientsReached}
            subtext="Successful deliveries, all time"
            icon={Users}
          />
          <StatCard
            label="Failed Deliveries"
            value={view.stats.failed}
            subtext="Retry from a broadcast's detail page"
            icon={AlertTriangle}
            highlight={view.stats.failed > 0}
          />
        </div>

        <div className="mb-4 flex gap-1 rounded-lg border border-ink-200 bg-white p-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                tab === key ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "compose" && (
          <ComposeForm view={view} onSent={() => setTab("history")} />
        )}

        {tab === "history" &&
          (view.communications.length === 0 ? (
            <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
              <Megaphone size={28} className="mx-auto mb-3 text-ink-300" />
              <p className="text-sm font-semibold text-ink-900">Nothing sent yet</p>
              <p className="mt-1 text-xs text-ink-500">
                Broadcasts you send appear here with a per-recipient delivery log.
              </p>
              <button
                onClick={() => setTab("compose")}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
              >
                <PenLine size={13} />
                Compose the first one
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {view.communications.map((c) => (
                <Link
                  key={c.id}
                  href={`/console/communications/${c.id}`}
                  className="block rounded-xl border border-ink-200 bg-white p-5 transition hover:border-ink-400"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-900">{c.subject}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {c.audienceSummary !== "—" ? c.audienceSummary : c.audience} ·{" "}
                        {c.channel} · {c.sentBy} · {c.sentAt}
                      </p>
                    </div>
                    <StatusBadge variant={c.statusVariant}>{c.status}</StatusBadge>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-ink-500">{c.excerpt}</p>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink-100 pt-3 text-xs">
                    <span className="text-ink-500">
                      <span className="font-semibold text-ink-900">{c.recipientCount}</span>{" "}
                      recipient{c.recipientCount === 1 ? "" : "s"}
                    </span>
                    <span className="text-ink-500">
                      <span className="font-semibold text-green-700">{c.sentCount}</span> sent
                    </span>
                    {c.failedCount > 0 && (
                      <span className="text-ink-500">
                        <span className="font-semibold text-red-600">{c.failedCount}</span> failed
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ))}

        {tab === "templates" && <TemplatesTab templates={view.templates} />}
      </main>
    </div>
  );
}
