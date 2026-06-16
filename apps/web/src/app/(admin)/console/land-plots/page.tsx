import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { LandPlotsTable, type PlotRow } from "./land-plots-table";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

type PlotStatus = "Available" | "Reserved" | "Allocated" | "On Hold";

const PLOT_STATUS: Record<string, PlotStatus> = {
  A1: "Available", A2: "Available", A3: "Allocated", A4: "Available",
  A5: "Reserved",  A6: "Available", A7: "Available", A8: "On Hold",
  B1: "Reserved",  B2: "Allocated", B3: "Available", B4: "Available",
  B5: "On Hold",   B6: "Available", B7: "Reserved",  B8: "Available",
  C1: "Available", C2: "Available", C3: "Reserved",  C4: "Allocated",
  C5: "Available", C6: "On Hold",   C7: "Available", C8: "Available",
  D1: "Allocated", D2: "Available", D3: "Available", D4: "Reserved",
  D5: "Available", D6: "Available", D7: "Allocated", D8: "On Hold",
};

const PLOT_COLORS: Record<PlotStatus, string> = {
  Available: "bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200",
  Reserved:  "bg-amber-100  border-amber-200  text-amber-700  hover:bg-amber-200",
  Allocated: "bg-blue-100   border-blue-200   text-blue-700   hover:bg-blue-200",
  "On Hold": "bg-pink-100   border-pink-200   text-pink-700   hover:bg-pink-200",
};

const LEGEND_DOTS: Record<PlotStatus, string> = {
  Available: "bg-emerald-400",
  Reserved:  "bg-amber-400",
  Allocated: "bg-blue-400",
  "On Hold": "bg-pink-400",
};

const STATUS_COUNTS: Record<PlotStatus, number> = {
  Available: 89, Reserved: 24, Allocated: 21, "On Hold": 14,
};

const TABLE_ROWS: PlotRow[] = [
  { id: "A3", cat: "Light Industry", area: 2.4, to: "Kampala Steel Ltd",   date: "Thu 12 Dec", status: "Allocated" },
  { id: "B2", cat: "Heavy Industry", area: 8.1, to: "Gulf Resources MENA", date: "Thu 12 Dec", status: "Allocated" },
  { id: "A5", cat: "Commercial",     area: 1.2, to: "—",                   date: "Thu 12 Dec", status: "Reserved"  },
  { id: "B5", cat: "Light Industry", area: 3.0, to: "—",                   date: "Thu 12 Dec", status: "On Hold"   },
];

const ROWS = ["A", "B", "C", "D"];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8];

export default async function LandPlotsPage() {
  await requireRole(ADMIN_ONLY);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Land Plot Manager" },
          ]}
        />

        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {(Object.keys(STATUS_COUNTS) as PlotStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${LEGEND_DOTS[s]}`} />
              <span className="text-xs text-ink-700">
                {s} ({STATUS_COUNTS[s]})
              </span>
            </div>
          ))}
        </div>

        {/* Plot grid */}
        <div className="mb-5 overflow-hidden rounded-xl border border-ink-200 bg-white p-5">
          <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
            {ROWS.flatMap((row) =>
              COLS.map((col) => {
                const id = `${row}${col}`;
                const status = PLOT_STATUS[id] ?? "Available";
                return (
                  <button
                    key={id}
                    title={`${id} — ${status}`}
                    className={`flex aspect-square items-center justify-center rounded-lg border text-xs font-bold transition ${PLOT_COLORS[status]}`}
                  >
                    {id}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        <LandPlotsTable data={TABLE_ROWS} />
      </main>
    </div>
  );
}
