import { Lock } from "lucide-react";
import type { LacReviewTally } from "@kip/shared";
import type {
  ClarificationView,
  DecisionLogEntry,
  LacReviewView,
} from "@/lib/admin/committee-mappers";
import { cn } from "@/lib/utils";

/**
 * Read-only panels shared by the TC and LAC review pages. Server-safe — the
 * interactive forms live in `decision-form.tsx`.
 */

export function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-ink-200 bg-white p-5", className)}>
      <h2 className="mb-3 text-sm font-bold text-ink-700">{title}</h2>
      {children}
    </section>
  );
}

/** Why the committee can't act right now (decided, waiting on the investor, window open). */
export function GateNotice({ reason }: { reason: string }) {
  return (
    <div className="flex gap-2 rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-600">
      <Lock size={16} className="mt-0.5 shrink-0 text-ink-400" />
      <p>{reason}</p>
    </div>
  );
}

function Notes({ text }: { text: string }) {
  return <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-700">{text}</p>;
}

/** Committee decisions with their written reasons. */
export function DecisionLogPanel({ entries }: { entries: DecisionLogEntry[] }) {
  return (
    <Panel title="Committee decisions">
      {entries.length === 0 ? (
        <p className="text-sm text-ink-500">No decisions recorded yet.</p>
      ) : (
        <ol className="space-y-4">
          {entries.map((e, i) => (
            <li key={i} className="border-l-2 border-ink-200 pl-3">
              <p className="text-sm font-semibold text-ink-900">{e.title}</p>
              <p className="text-xs text-ink-500">
                {e.actor} · {e.time}
              </p>
              {e.notes && <Notes text={e.notes} />}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/** Every request for more information and the investor's reply. */
export function ClarificationsPanel({ items }: { items: ClarificationView[] }) {
  if (items.length === 0) return null;
  return (
    <Panel title="Requests for more information">
      <ol className="space-y-4">
        {items.map((c, i) => (
          <li key={i} className="space-y-2">
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                {c.committee} asked · {c.askedAt}
              </p>
              <Notes text={c.question} />
            </div>
            {c.response ? (
              <div className="ml-4 rounded-lg bg-ink-50 p-3">
                <p className="text-xs font-semibold text-ink-600">Investor replied · {c.respondedAt}</p>
                <Notes text={c.response} />
              </div>
            ) : (
              <p className="ml-4 text-xs font-semibold text-amber-700">Waiting for the investor&apos;s reply</p>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

const RECOMMENDATION_TONE: Record<string, string> = {
  APPROVE: "bg-green-100 text-green-700",
  REJECT: "bg-red-100 text-red-700",
  MORE_INFO: "bg-amber-100 text-amber-700",
};

/** Each LAC member's recommendation, with the running tally. */
export function LacReviewsPanel({ reviews, tally }: { reviews: LacReviewView[]; tally: LacReviewTally }) {
  return (
    <Panel title="Member recommendations">
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        {(
          [
            ["Approve", tally.APPROVE, "text-green-700"],
            ["Reject", tally.REJECT, "text-red-700"],
            ["More info", tally.MORE_INFO, "text-amber-700"],
          ] as const
        ).map(([label, n, tone]) => (
          <div key={label} className="rounded-lg border border-ink-100 py-2">
            <p className={cn("text-xl font-bold tabular-nums", tone)}>{n}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
          </div>
        ))}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-ink-500">No member has recorded a recommendation yet.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r, i) => (
            <li key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink-900">
                  {r.reviewerName}
                  {r.isMine && <span className="font-normal text-ink-500"> (you)</span>}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", RECOMMENDATION_TONE[r.recommendation] ?? "bg-ink-100 text-ink-600")}>
                  {r.recommendationLabel}
                </span>
              </div>
              <p className="text-xs text-ink-500">{r.updatedAt}</p>
              <Notes text={r.notes} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** The application's full timeline (payment, submission, every review action). */
export function AuditTrailPanel({ items }: { items: { time: string; text: string; actor: string }[] }) {
  return (
    <Panel title="Audit trail">
      {items.length === 0 ? (
        <p className="text-sm text-ink-500">No recorded activity.</p>
      ) : (
        <ol className="relative border-l border-ink-200 pl-4">
          {items.map((a, i) => (
            <li key={i} className="mb-4 last:mb-0">
              <p className="text-xs font-semibold text-brand-600">{a.time}</p>
              <p className="text-sm font-semibold text-ink-900">{a.text}</p>
              <p className="text-xs text-ink-500">{a.actor}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
