import { describe, it, expect } from "vitest";
import { CommunicationAudience } from "@kip/shared";
import {
  EMPTY_AUDIENCE,
  describeAudience,
  previewVarsFor,
  resolveRecipients,
  type AudienceSelection,
  type RecipientPool,
} from "./communication-audience";
import { EMPTY_INVESTOR_FILTERS, ZONE_NONE } from "./report-filters";
import { investorRow, notifySignupRow, staffRow } from "./test-fixtures";

const sel = (over: Partial<AudienceSelection> = {}): AudienceSelection => ({
  ...EMPTY_AUDIENCE,
  filters: { ...EMPTY_INVESTOR_FILTERS },
  ...over,
});

/**
 * Three investors spanning two zones plus one with no declared zone, two staff
 * in different roles, and a notify-list address that deliberately collides with
 * an investor's email.
 */
function pool(): RecipientPool {
  return {
    investors: [
      investorRow({ id: "i1", email: "a@gulf.ae", company: "Gulf Petrochem" }),
      investorRow({
        id: "i2",
        email: "b@ugfert.co.ug",
        company: "Uganda Fertiliser",
        zoneKey: "AGRO_INDUSTRIAL",
        zone: "Agro-Industrial Zone",
        eoiStage: "Allocated",
        country: "Uganda",
      }),
      investorRow({
        id: "i3",
        email: "c@nile.co.ug",
        company: "Nile Energy",
        zoneKey: "",
        zone: "Not specified",
        eoiStage: "Draft",
        reference: "—",
        country: "Uganda",
      }),
    ],
    staff: [
      staffRow({ id: "s1", email: "chair@kip.unoc.co.ug", role: "TC Chair" }),
      staffRow({ id: "s2", email: "admin@kip.unoc.co.ug", role: "Administrator" }),
    ],
    signups: [notifySignupRow({ id: "n1", email: "watcher@example.com" })],
  };
}

describe("resolveRecipients", () => {
  it("ALL_INVESTORS takes every investor", () => {
    const out = resolveRecipients(pool(), sel({ audience: CommunicationAudience.ALL_INVESTORS }));
    expect(out.map((r) => r.email)).toEqual(["a@gulf.ae", "b@ugfert.co.ug", "c@nile.co.ug"]);
  });

  it("INVESTOR_SEGMENT honours the shared investor filters", () => {
    const out = resolveRecipients(
      pool(),
      sel({
        audience: CommunicationAudience.INVESTOR_SEGMENT,
        filters: { ...EMPTY_INVESTOR_FILTERS, zone: "AGRO_INDUSTRIAL" },
      }),
    );
    expect(out.map((r) => r.email)).toEqual(["b@ugfert.co.ug"]);
  });

  it("INVESTOR_SEGMENT with ZONE_NONE selects only investors who declared no zone", () => {
    const out = resolveRecipients(
      pool(),
      sel({
        audience: CommunicationAudience.INVESTOR_SEGMENT,
        filters: { ...EMPTY_INVESTOR_FILTERS, zone: ZONE_NONE },
      }),
    );
    expect(out.map((r) => r.email)).toEqual(["c@nile.co.ug"]);
  });

  it("INVESTOR_SEGMENT with no filters set is the same as all investors", () => {
    const out = resolveRecipients(
      pool(),
      sel({ audience: CommunicationAudience.INVESTOR_SEGMENT }),
    );
    expect(out).toHaveLength(3);
  });

  it("STAFF with no roles selected takes every staff member", () => {
    const out = resolveRecipients(pool(), sel({ audience: CommunicationAudience.STAFF }));
    expect(out.map((r) => r.email)).toEqual([
      "chair@kip.unoc.co.ug",
      "admin@kip.unoc.co.ug",
    ]);
  });

  it("STAFF filters to the chosen roles", () => {
    const out = resolveRecipients(
      pool(),
      sel({ audience: CommunicationAudience.STAFF, staffRoles: ["TC Chair"] }),
    );
    expect(out.map((r) => r.email)).toEqual(["chair@kip.unoc.co.ug"]);
  });

  it("NOTIFY_LIST recipients carry no userId, since they have no portal account", () => {
    const out = resolveRecipients(pool(), sel({ audience: CommunicationAudience.NOTIFY_LIST }));
    expect(out.every((r) => r.userId === null)).toBe(true);
  });

  it("CUSTOM takes exactly the hand-picked ids", () => {
    const out = resolveRecipients(
      pool(),
      sel({ audience: CommunicationAudience.CUSTOM, manualIds: ["i3", "i1"] }),
    );
    // Pool order, not click order — the send list is stable.
    expect(out.map((r) => r.email)).toEqual(["a@gulf.ae", "c@nile.co.ug"]);
  });

  it("CUSTOM with nothing picked resolves to nobody", () => {
    expect(resolveRecipients(pool(), sel({ audience: CommunicationAudience.CUSTOM }))).toEqual([]);
  });

  it("de-duplicates case-insensitively, so one address gets one copy", () => {
    const p = pool();
    // Two investor accounts sharing a login address in different casing — the
    // realistic collision, since each audience mode draws from one source.
    p.investors = [
      investorRow({ id: "i1", email: "shared@gulf.ae", company: "Gulf Petrochem" }),
      investorRow({ id: "i2", email: "SHARED@gulf.ae", company: "Gulf Petrochem Trading" }),
    ];
    const out = resolveRecipients(p, sel({ audience: CommunicationAudience.ALL_INVESTORS }));
    expect(out).toHaveLength(1);
    // First row wins, so the send list is predictable.
    expect(out[0]?.company).toBe("Gulf Petrochem");
  });

  it("de-duplicates repeated notify-list addresses", () => {
    const p = pool();
    p.signups = [
      notifySignupRow({ id: "n1", email: "watcher@example.com" }),
      notifySignupRow({ id: "n2", email: "Watcher@Example.com" }),
    ];
    expect(resolveRecipients(p, sel({ audience: CommunicationAudience.NOTIFY_LIST }))).toHaveLength(
      1,
    );
  });

  it("drops rows with no usable email rather than letting the API reject the batch", () => {
    const p = pool();
    p.investors = [
      investorRow({ id: "i1", email: "" }),
      investorRow({ id: "i2", email: "not-an-email" }),
      investorRow({ id: "i3", email: "c@nile.co.ug" }),
    ];
    const out = resolveRecipients(p, sel({ audience: CommunicationAudience.ALL_INVESTORS }));
    expect(out.map((r) => r.email)).toEqual(["c@nile.co.ug"]);
  });

  it("blanks a dash reference so the merge fallback wording is used", () => {
    const out = resolveRecipients(
      pool(),
      sel({ audience: CommunicationAudience.CUSTOM, manualIds: ["i3"] }),
    );
    expect(out[0]?.reference).toBe("");
  });

  it("carries the merge fields the API expects for every audience", () => {
    for (const audience of Object.values(CommunicationAudience)) {
      const out = resolveRecipients(
        pool(),
        sel({ audience, manualIds: ["i1"], staffRoles: [] }),
      );
      for (const r of out) {
        expect(typeof r.email).toBe("string");
        expect(typeof r.name).toBe("string");
        expect(typeof r.company).toBe("string");
        expect(typeof r.reference).toBe("string");
      }
    }
  });

  it("is empty-safe on an empty pool", () => {
    const empty: RecipientPool = { investors: [], staff: [], signups: [] };
    for (const audience of Object.values(CommunicationAudience)) {
      expect(resolveRecipients(empty, sel({ audience }))).toEqual([]);
    }
  });
});

describe("describeAudience", () => {
  it("names every audience mode", () => {
    for (const audience of Object.values(CommunicationAudience)) {
      const text = describeAudience(sel({ audience }), 5);
      expect(text).toContain("5 recipients");
      expect(text.length).toBeGreaterThan("5 recipients".length);
    }
  });

  it("singularises a one-recipient send", () => {
    expect(describeAudience(sel(), 1)).toContain("1 recipient");
    expect(describeAudience(sel(), 1)).not.toContain("1 recipients");
  });

  it("spells out the segment filters so a stored send explains itself", () => {
    const text = describeAudience(
      sel({
        audience: CommunicationAudience.INVESTOR_SEGMENT,
        filters: { ...EMPTY_INVESTOR_FILTERS, stage: "Shortlisted", country: "Uganda" },
      }),
      2,
    );
    expect(text).toContain("Shortlisted");
    expect(text).toContain("Uganda");
  });

  it("lists the chosen staff roles", () => {
    expect(
      describeAudience(
        sel({ audience: CommunicationAudience.STAFF, staffRoles: ["TC Chair", "Administrator"] }),
        2,
      ),
    ).toContain("TC Chair, Administrator");
  });
});

describe("previewVarsFor", () => {
  it("returns the first recipient's details so the preview shows real merged text", () => {
    const out = resolveRecipients(pool(), sel({ audience: CommunicationAudience.ALL_INVESTORS }));
    expect(previewVarsFor(out)).toEqual({
      company: "Gulf Petrochem",
      repName: "Ada Rep",
      email: "a@gulf.ae",
      reference: "KIP-EOI-2026-0001",
    });
  });

  it("returns null with no recipients, so the caller falls back to samples", () => {
    expect(previewVarsFor([])).toBeNull();
  });
});
