"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { EoiPlotOption } from "@/lib/eoi-data";

const ZONE_COLORS: Record<string, string> = {
  "Agro Processing Industries": "#3f9d3f",
  "Commercial Zone": "#2f6fd6",
  "Down Stream Industries": "#b8860b",
  "High Density Residential": "#8b2b3a",
  "Light Industry": "#b02fc0",
  "Low Density Housing": "#e0a92e",
  "Ware Housing": "#d1495b",
};

function zoneColor(zone: string | null): string {
  return (zone && ZONE_COLORS[zone]) || "#6b7280";
}

/**
 * Interactive plot map. Renders the synced plot outlines (GeoJSON, WGS84) on an
 * OpenStreetMap base, coloured by zone; clicking a plot selects it. Leaflet is
 * loaded on the client only (dynamic import) since it touches `window`.
 */
export function PlotMap({
  plots,
  selectedId,
  zone,
  onSelect,
  disabled,
}: {
  plots: EoiPlotOption[];
  selectedId: string | null;
  zone: string;
  onSelect: (plotId: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);
  const fitKeyRef = useRef<string>("");

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  function draw() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    const features = plots
      .filter((p) => p.geometry && (!zone || p.zone === zone))
      .map((p) => ({
        type: "Feature" as const,
        properties: {
          id: p.id,
          name: p.plotName,
          zone: p.zone,
          count: p.applicantCount,
          acreage: p.acreage,
        },
        geometry: JSON.parse(p.geometry as string),
      }));

    if (features.length === 0) return;

    const gj = L.geoJSON(
      { type: "FeatureCollection", features },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: (f: any) => {
          const sel = f.properties.id === selectedId;
          const color = zoneColor(f.properties.zone);
          return {
            color: sel ? "#111827" : color,
            weight: sel ? 3 : 1,
            fillColor: color,
            fillOpacity: sel ? 0.6 : 0.35,
          };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onEachFeature: (f: any, layer: any) => {
          const p = f.properties;
          const acre = p.acreage != null ? ` · ${p.acreage.toFixed(2)} ac` : "";
          const applied = p.count > 0 ? ` · ${p.count} applied` : "";
          layer.bindTooltip(`${p.name} · ${p.zone ?? "—"}${acre}${applied}`, { sticky: true });
          layer.on("click", () => {
            if (!disabledRef.current) onSelectRef.current(p.id);
          });
        },
      },
    ).addTo(map);
    layerRef.current = gj;

    // Only refit when the visible set changes (zone / count), not on selection.
    const fitKey = `${zone}|${features.length}`;
    if (fitKey !== fitKeyRef.current) {
      fitKeyRef.current = fitKey;
      try {
        map.fitBounds(gj.getBounds(), { padding: [20, 20], maxZoom: 16 });
      } catch {
        /* empty bounds — ignore */
      }
    }
  }

  // Init once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [1.43, 31.35],
        12,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      draw();
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw on data / filter / selection change.
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plots, zone, selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-lg border border-ink-200"
      style={{ zIndex: 0 }}
    />
  );
}
