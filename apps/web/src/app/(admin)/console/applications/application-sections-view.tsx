import { SECTION_LABELS, type SectionKey } from "@/lib/application-data";

/**
 * Read-only render of the full EOI content an investor submitted. The six
 * section payloads are free-form JSON (see @kip/shared section schemas), so this
 * walks each payload generically rather than hard-coding six bespoke views —
 * every field shows, whatever the schema evolves into. The one special case is
 * the `notApplicable` map (spec §8), pulled out and shown as deliberate N/A
 * answers rather than mixed in with the data.
 */

interface SectionVM {
  key: string;
  label: string;
  complete: boolean;
  payload: unknown;
}

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function humanizeScalar(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  const s = value.trim();
  if (s === "") return "—";
  // SCREAMING_SNAKE_CASE enum → Title Case
  if (/^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(s)) {
    return s
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return s;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (isPlainObject(v)) return Object.keys(v).length === 0;
  return false;
}

function RenderValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-ink-400">—</span>;
  }
  if (typeof value !== "object") {
    return <span className="text-ink-900">{humanizeScalar(value as string | number | boolean)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ink-400">None</span>;
    return (
      <ol className="mt-1 space-y-2">
        {value.map((item, i) => (
          <li key={i} className="rounded-lg border border-ink-100 bg-ink-50/50 p-2.5">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              #{i + 1}
            </span>
            <RenderValue value={item} />
          </li>
        ))}
      </ol>
    );
  }
  return <RenderObject obj={value as Record<string, unknown>} />;
}

function RenderObject({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj).filter(([k]) => k !== "notApplicable");
  if (entries.length === 0) return <span className="text-ink-400">—</span>;
  return (
    <dl className="space-y-2">
      {entries.map(([k, v]) => {
        const nested = isPlainObject(v) || (Array.isArray(v) && v.length > 0);
        return (
          <div
            key={k}
            className={nested ? "" : "grid grid-cols-1 gap-0.5 sm:grid-cols-[200px_1fr] sm:gap-3"}
          >
            <dt className="text-xs font-semibold text-ink-600">{humanizeKey(k)}</dt>
            <dd className="m-0 text-sm">
              <RenderValue value={v} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function NotApplicable({ na }: { na: Record<string, string> }) {
  const entries = Object.entries(na).filter(([, reason]) => (reason ?? "").trim().length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
        Marked Not Applicable
      </p>
      <dl className="space-y-1.5">
        {entries.map(([k, reason]) => (
          <div key={k} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[200px_1fr] sm:gap-3">
            <dt className="text-xs font-semibold text-amber-800">{humanizeKey(k.split(".").pop() ?? k)}</dt>
            <dd className="m-0 text-sm text-amber-900">{reason}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ApplicationSectionsView({ sections }: { sections: SectionVM[] }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold text-ink-700">Submitted Details</h2>
      <div className="space-y-5">
        {sections.map((s) => {
          const na =
            isPlainObject(s.payload) && isPlainObject((s.payload as Record<string, unknown>).notApplicable)
              ? ((s.payload as Record<string, unknown>).notApplicable as Record<string, string>)
              : null;
          const label = SECTION_LABELS[s.key as SectionKey] ?? s.label;
          const empty = isEmpty(s.payload);
          return (
            <section key={s.key} className="border-t border-ink-100 pt-4 first:border-t-0 first:pt-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink-900">{label}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    s.complete ? "bg-green-50 text-green-700" : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {s.complete ? "Complete" : "Incomplete"}
                </span>
              </div>
              {empty ? (
                <p className="text-sm text-ink-400">Nothing entered yet.</p>
              ) : (
                <RenderValue value={s.payload} />
              )}
              {na && <NotApplicable na={na} />}
            </section>
          );
        })}
      </div>
    </div>
  );
}
