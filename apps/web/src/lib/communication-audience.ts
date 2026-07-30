/**
 * Audience resolution for the Communications composer.
 *
 * Pure — no `@kip/db`, no `server-only`, no React — so it runs in the browser
 * (the composer needs a live recipient count as filters change) and is
 * unit-testable. The admin console resolves the list here and posts it to the
 * API, which means the count shown next to the Send button is the same list that
 * gets mailed.
 *
 * Segment filtering delegates to `filterInvestors` in `./report-filters` rather
 * than reimplementing it, so a broadcast to "Heavy Industrial · Shortlisted"
 * always hits exactly the rows the investors report shows for that filter.
 */

import { CommunicationAudience, type MergeVars } from "@kip/shared";
import {
  describeInvestorFilters,
  EMPTY_INVESTOR_FILTERS,
  filterInvestors,
  type InvestorFilters,
} from "./report-filters";
import type {
  InvestorReportRow,
  NotifySignupRow,
  StaffRow,
} from "./admin/mappers";

/** Mirrors `RecipientPool` in `admin/queries.ts` (kept structural to stay DB-free). */
export type RecipientPool = {
  investors: InvestorReportRow[];
  staff: StaffRow[];
  signups: NotifySignupRow[];
};

/** One resolved recipient — the exact shape the API's `recipientSchema` expects. */
export type Recipient = {
  /** Null for notify-list addresses, which have no portal account. */
  userId: string | null;
  email: string;
  name: string;
  company: string;
  reference: string;
};

export type AudienceSelection = {
  audience: CommunicationAudience;
  /** Only consulted for `INVESTOR_SEGMENT`. */
  filters: InvestorFilters;
  /** Role labels as they appear on `StaffRow.role`; empty = every staff member. */
  staffRoles: string[];
  /** `InvestorReportRow.id`s — only consulted for `CUSTOM`. */
  manualIds: string[];
};

export const EMPTY_AUDIENCE: AudienceSelection = {
  audience: CommunicationAudience.ALL_INVESTORS,
  filters: EMPTY_INVESTOR_FILTERS,
  staffRoles: [],
  manualIds: [],
};

function investorRecipient(r: InvestorReportRow): Recipient {
  return {
    userId: r.id,
    email: r.email,
    name: r.rep,
    company: r.company,
    // `reference` is "—" on the row when there's no EOI yet; merge tokens want
    // an empty string so the fallback phrase kicks in instead of a dash.
    reference: r.reference === "—" ? "" : r.reference,
  };
}

/**
 * Resolve a selection to concrete recipients.
 *
 * De-duplicated by lowercased email, first source winning — an investor who also
 * signed up to the notify list must not get two copies of the same broadcast.
 * Rows without a usable email are dropped rather than sent to the API, which
 * would reject the whole batch.
 */
export function resolveRecipients(
  pool: RecipientPool,
  selection: AudienceSelection,
): Recipient[] {
  let candidates: Recipient[];

  switch (selection.audience) {
    case CommunicationAudience.ALL_INVESTORS:
      candidates = pool.investors.map(investorRecipient);
      break;

    case CommunicationAudience.INVESTOR_SEGMENT:
      candidates = filterInvestors(pool.investors, selection.filters).map(investorRecipient);
      break;

    case CommunicationAudience.STAFF: {
      const wanted = new Set(selection.staffRoles);
      candidates = pool.staff
        .filter((s) => wanted.size === 0 || wanted.has(s.role))
        .map((s) => ({
          userId: s.id,
          email: s.email,
          name: s.name,
          company: "UNOC / KIP Secretariat",
          reference: "",
        }));
      break;
    }

    case CommunicationAudience.NOTIFY_LIST:
      candidates = pool.signups.map((s) => ({
        userId: null,
        email: s.email,
        name: "",
        company: "",
        reference: "",
      }));
      break;

    case CommunicationAudience.CUSTOM: {
      const wanted = new Set(selection.manualIds);
      candidates = pool.investors.filter((r) => wanted.has(r.id)).map(investorRecipient);
      break;
    }

    default:
      candidates = [];
  }

  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const c of candidates) {
    const key = c.email.trim().toLowerCase();
    if (key === "" || !key.includes("@") || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** One-line description of the audience, stored on the broadcast for the record. */
export function describeAudience(
  selection: AudienceSelection,
  recipientCount: number,
): string {
  const people = `${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`;

  switch (selection.audience) {
    case CommunicationAudience.ALL_INVESTORS:
      return `All investors · ${people}`;
    case CommunicationAudience.INVESTOR_SEGMENT:
      return `${describeInvestorFilters(selection.filters)} · ${people}`;
    case CommunicationAudience.STAFF:
      return selection.staffRoles.length > 0
        ? `Staff: ${selection.staffRoles.join(", ")} · ${people}`
        : `All staff · ${people}`;
    case CommunicationAudience.NOTIFY_LIST:
      return `Notify-me list · ${people}`;
    case CommunicationAudience.CUSTOM:
      return `Hand-picked · ${people}`;
    default:
      return people;
  }
}

/** Sample merge values for the composer preview, taken from a real recipient. */
export function previewVarsFor(recipients: Recipient[]): Partial<MergeVars> | null {
  const first = recipients[0];
  if (!first) return null;
  return {
    company: first.company,
    repName: first.name,
    email: first.email,
    reference: first.reference,
  };
}
