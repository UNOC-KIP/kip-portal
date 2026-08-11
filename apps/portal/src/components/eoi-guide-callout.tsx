import { BookOpen, Download } from "lucide-react";
import { EOI_INVESTOR_GUIDE } from "@/lib/resources";

/**
 * Prominent download callout for the EOI Investor Guide.
 *
 * Two variants, because the guide has to read as "read this first" in two very
 * different surroundings:
 *   light — full-width band on the public marketing pages; goes side-by-side
 *           once there is room for it.
 *   dark  — the signed-in dashboard's 320px right rail, so it always stacks.
 *           `sm:` is a viewport breakpoint, not a container one, so a
 *           side-by-side layout would be cramped there on a desktop screen.
 */
export function EoiGuideCallout({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const dark = variant === "dark";

  return (
    <div
      className={`flex flex-col gap-4 rounded-[5px] border ${
        dark
          ? "border-white/10 bg-gradient-to-br from-black to-ink-800 p-5 text-white"
          : "border-kip-gold/40 bg-kip-gold/15 p-6 sm:flex-row sm:items-center sm:gap-5 sm:p-7"
      } ${className}`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-[4px] ${
          dark ? "h-9 w-9 bg-white/10 text-kip-gold" : "h-12 w-12 bg-white text-kip-red"
        }`}
      >
        <BookOpen size={dark ? 17 : 22} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`font-bold uppercase tracking-widest ${
            dark ? "text-[9px] text-white/40" : "text-[10px] text-black/50"
          }`}
        >
          Start here
        </p>
        <h3
          className={`mt-1 font-extrabold leading-snug ${
            dark ? "text-[14px] text-white" : "text-[16px] text-black sm:text-[18px]"
          }`}
        >
          {EOI_INVESTOR_GUIDE.title}
        </h3>
        <p
          className={`mt-1.5 leading-relaxed ${
            dark ? "text-[11px] text-white/60" : "text-[13px] text-black/70"
          }`}
        >
          {EOI_INVESTOR_GUIDE.description}
        </p>
        <p
          className={`mt-2 font-medium ${
            dark ? "text-[10px] text-white/35" : "text-[11px] text-black/45"
          }`}
        >
          {EOI_INVESTOR_GUIDE.meta}
        </p>
      </div>

      {/* Cross-origin links ignore `download`, so target=_blank is what stops
          the click navigating the investor away from the portal. */}
      <a
        href={EOI_INVESTOR_GUIDE.url}
        download={EOI_INVESTOR_GUIDE.filename}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-[4px] font-bold transition hover:brightness-110 ${
          dark
            ? "w-full bg-kip-gold px-4 py-2.5 text-[12px] text-black"
            : "px-6 py-3 text-[13px] bg-kip-red text-white"
        }`}
      >
        <Download size={dark ? 13 : 15} /> Download the Guide
      </a>
    </div>
  );
}
