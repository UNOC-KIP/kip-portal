/**
 * KIP master-plan zones — the single source of truth for the public land map
 * and the investor site-visit booking form.
 *
 * Pure data only. This module is imported by edge middleware paths via
 * `@kip/shared`, so it must never pull in `@kip/db`, `server-only`, or any
 * runtime dependency.
 */

export const KipZone = {
  HEAVY_INDUSTRIAL:    "HEAVY_INDUSTRIAL",
  LIGHT_DOWNSTREAM:    "LIGHT_DOWNSTREAM",
  AGRO_INDUSTRIAL:     "AGRO_INDUSTRIAL",
  BUSINESS_COMMERCIAL: "BUSINESS_COMMERCIAL",
  RESIDENTIAL_ESTATE:  "RESIDENTIAL_ESTATE",
  ADMINISTRATION:      "ADMINISTRATION",
} as const;
export type KipZone = (typeof KipZone)[keyof typeof KipZone];

export interface KipZoneDef {
  key: KipZone;
  label: string;
  /** Tailwind background class used for the legend swatch. */
  color: string;
  area: string;
  desc: string;
  /** `false` → shown on the land map, but not offered for allocation. */
  investable: boolean;
  landUses: readonly string[];
}

export const KIP_ZONES: readonly KipZoneDef[] = [
  {
    key: KipZone.HEAVY_INDUSTRIAL,
    label: "Heavy Industrial Zone",
    color: "bg-red-600",
    area: "≈ 871.7 acres",
    desc: "Petrochemicals, polymers, fertiliser, bonded warehousing, free trade zone and waste management — supporting Uganda's petroleum value chain.",
    investable: true,
    landUses: [
      "Petrochemicals & Refining",
      "Polymers & Plastics",
      "Fertiliser & Chemicals",
      "Bonded Warehousing",
      "Free Trade Zone",
      "Waste Management",
    ],
  },
  {
    key: KipZone.LIGHT_DOWNSTREAM,
    label: "Light & Downstream Hub",
    color: "bg-emerald-600",
    area: "≈ 688.1 acres",
    desc: "Light industrial and downstream manufacturing — furniture, textiles, packaging, automotive parts and end-user product assembly.",
    investable: true,
    landUses: [
      "Furniture",
      "Textiles & Apparel",
      "Packaging",
      "Automotive Parts",
      "Product Assembly",
    ],
  },
  {
    key: KipZone.AGRO_INDUSTRIAL,
    label: "Agro-Industrial Zone",
    color: "bg-lime-600",
    area: "Agro-processing",
    desc: "Fruit, dairy and meat processing and value-added agricultural manufacturing, leveraging nearby agricultural zones.",
    investable: true,
    landUses: [
      "Fruit Processing",
      "Dairy Processing",
      "Meat Processing",
      "Value-Added Agricultural Manufacturing",
    ],
  },
  {
    key: KipZone.BUSINESS_COMMERCIAL,
    label: "Business / Commercial",
    color: "bg-purple-600",
    area: "≈ 273.0 acres",
    desc: "Warehouse development, retail, mixed use, hospitality & events and petrol filling — serving tenants, workers and visitors.",
    investable: true,
    landUses: [
      "Warehousing",
      "Retail",
      "Mixed Use",
      "Hospitality & Events",
      "Petrol Filling Station",
    ],
  },
  {
    key: KipZone.RESIDENTIAL_ESTATE,
    label: "Residential / Estate",
    color: "bg-blue-600",
    area: "≈ 217.6 acres",
    desc: "High- and low-density housing, primary and secondary schools, a technology campus and a Health Centre IV.",
    investable: false,
    landUses: [],
  },
  {
    key: KipZone.ADMINISTRATION,
    label: "Administration Zone",
    color: "bg-amber-500",
    area: "≈ 134.6 acres",
    desc: "Park HQ, UNOC and government offices, ICT, security and a One-Stop Centre for licensing, registration and investor aftercare.",
    investable: false,
    landUses: [],
  },
];

/** Zones an investor may request a plot in. */
export const INVESTABLE_ZONES: readonly KipZoneDef[] = KIP_ZONES.filter((z) => z.investable);

export const KIP_ZONE_LABELS: Record<KipZone, string> = KIP_ZONES.reduce(
  (acc, z) => {
    acc[z.key] = z.label;
    return acc;
  },
  {} as Record<KipZone, string>,
);

export function zoneDef(zone: KipZone): KipZoneDef | undefined {
  return KIP_ZONES.find((z) => z.key === zone);
}

/** Land uses permitted in a zone. Empty for non-investable zones. */
export function landUsesForZone(zone: KipZone): readonly string[] {
  return zoneDef(zone)?.landUses ?? [];
}

export function isInvestableZone(zone: KipZone): boolean {
  return zoneDef(zone)?.investable ?? false;
}

/** Acreage bounds for the site-visit booking slider. */
export const SITE_VISIT_MIN_ACRES = 0;
export const SITE_VISIT_MAX_ACRES = 100;
