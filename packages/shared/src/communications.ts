/**
 * Pure rendering logic for admin-composed broadcasts.
 *
 * Lives in `@kip/shared` so the admin console's live preview and the API's
 * send-time HTML come out of the *same* function — a preview that disagrees
 * with what lands in the inbox is worse than no preview.
 *
 * Dependency-free and edge-safe (same constraint as `timeline.ts`).
 */

// ─── Merge tokens ────────────────────────────────────────────────────────────

/**
 * Placeholders an admin can drop into a subject or body. `sample` drives the
 * "send test to me" preview; `fallback` is substituted when a recipient has no
 * value for the field, so a broadcast never reads "Dear ,".
 */
export const MERGE_TOKENS: {
  token: string;
  key: keyof MergeVars;
  label: string;
  sample: string;
  fallback: string;
}[] = [
  { token: "{{company}}",   key: "company",   label: "Company name",  sample: "Gulf Petrochem International FZE", fallback: "Investor" },
  { token: "{{repName}}",   key: "repName",   label: "Contact name",  sample: "Amina Hassan",                     fallback: "there" },
  { token: "{{email}}",     key: "email",     label: "Email address", sample: "investor@gulfpetrochem.ae",        fallback: "" },
  { token: "{{reference}}", key: "reference", label: "EOI reference", sample: "KIP-EOI-2026-0001",                fallback: "your application" },
];

export type MergeVars = {
  company: string;
  repName: string;
  email: string;
  reference: string;
};

/** Sample values for every token — used by the preview and the test send. */
export function sampleMergeVars(): MergeVars {
  return MERGE_TOKENS.reduce((acc, t) => {
    acc[t.key] = t.sample;
    return acc;
  }, {} as MergeVars);
}

const FALLBACKS: Record<string, string> = MERGE_TOKENS.reduce<Record<string, string>>(
  (acc, t) => {
    acc[t.key] = t.fallback;
    return acc;
  },
  {},
);

/**
 * Substitute `{{token}}` placeholders. Unknown tokens are left verbatim rather
 * than blanked, so a typo is visible in the preview instead of silently eating
 * text. Empty values fall back to a neutral phrase.
 */
export function applyMergeTokens(text: string, vars: Partial<MergeVars>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, rawKey: string) => {
    if (!(rawKey in FALLBACKS)) return whole;
    const value = vars[rawKey as keyof MergeVars];
    return value && value.trim() !== "" ? value : (FALLBACKS[rawKey] ?? "");
  });
}

// ─── Body rendering ──────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A URL is only allowed through as an `href` if it is plainly http(s) or
 * mailto. Anything else (`javascript:`, `data:`, protocol-relative) is dropped
 * and the link renders as plain text.
 */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) return trimmed;
  if (/^mailto:[^\s]+$/i.test(trimmed)) return trimmed;
  return null;
}

const P_STYLE = "margin:0 0 14px;font-size:14px;line-height:1.6;color:#3f3f46";
const UL_STYLE = "margin:0 0 14px;padding-left:20px;font-size:14px;line-height:1.6;color:#3f3f46";
const LI_STYLE = "margin:0 0 6px";
const A_STYLE = "color:#C8102E;text-decoration:underline";

/**
 * Inline formatting, applied to text that has ALREADY been HTML-escaped.
 * Links first, so `*` characters inside a URL aren't read as emphasis.
 */
function inlineFormat(escaped: string): string {
  return escaped
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, url: string) => {
      // The URL arrives escaped, so `&amp;` must go back to `&` for the href.
      const href = safeHref(url.replace(/&amp;/g, "&"));
      if (!href) return whole;
      return `<a href="${escapeHtml(href)}" style="${A_STYLE}">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#18181b">$1</strong>')
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

/**
 * Render an admin-authored body into email-safe HTML.
 *
 * **Escape first, then format** — this ordering is the security boundary. The
 * whole string is HTML-escaped up front, so no authored markup can ever reach a
 * recipient as live HTML; only the tags this function emits are real.
 *
 * Supported subset: blank-line paragraphs, single newline → `<br>`,
 * `**bold**`, `*italic*`, `- ` bullet lists, `[text](https://url)`.
 */
export function renderBodyHtml(body: string): string {
  const isBullet = (line: string) => /^\s*[-*]\s+/.test(line);

  const paragraph = (lines: string[]) =>
    `<p style="${P_STYLE}">${lines.map((l) => inlineFormat(escapeHtml(l.trim()))).join("<br>")}</p>`;

  const list = (lines: string[]) =>
    `<ul style="${UL_STYLE}">${lines
      .map((l) => inlineFormat(escapeHtml(l.replace(/^\s*[-*]\s+/, ""))))
      .map((html) => `<li style="${LI_STYLE}">${html}</li>`)
      .join("")}</ul>`;

  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.trim() !== "");
      if (lines.length === 0) return "";

      // Bullets are split out from surrounding prose *within* a block, because
      // writing a lead-in line straight before the bullets — with no blank line —
      // is how people actually type this, and it must still produce a real list.
      const out: string[] = [];
      let run: string[] = [];
      let runIsList = isBullet(lines[0]!);

      const flush = () => {
        if (run.length === 0) return;
        out.push(runIsList ? list(run) : paragraph(run));
        run = [];
      };

      for (const line of lines) {
        const bullet = isBullet(line);
        if (bullet !== runIsList) {
          flush();
          runIsList = bullet;
        }
        run.push(line);
      }
      flush();

      return out.join("\n");
    })
    .filter((s) => s !== "")
    .join("\n");
}

/** First ~160 chars of a body as one line — list previews and inbox summaries. */
export function bodyExcerpt(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
