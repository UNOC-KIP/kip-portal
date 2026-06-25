"use client";

import { useEffect, useState } from "react";

function calcRemaining(closeAt: string) {
  const diff = new Date(closeAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSecs = Math.floor(diff / 1000);
  return {
    days:  Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    mins:  Math.floor((totalSecs % 3600) / 60),
    secs:  totalSecs % 60,
  };
}

interface CountdownTimerProps {
  closeAt: string;
  variant?: "default" | "hero";
}

export function CountdownTimer({ closeAt, variant = "default" }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(closeAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(calcRemaining(closeAt)), 1_000);
    return () => clearInterval(id);
  }, [closeAt]);

  if (!remaining) {
    if (variant === "hero") {
      return <p className="text-[16px] font-bold text-kip-red">Application window is closed</p>;
    }
    return <p className="text-sm font-semibold text-red-600">Window is closed</p>;
  }

  if (variant === "hero") {
    return (
      <div className="flex items-center gap-8 sm:gap-10">
        {([
          [remaining.days,  "DAYS"],
          [remaining.hours, "HOURS"],
          [remaining.mins,  "MINS"],
          [remaining.secs,  "SECS"],
        ] as [number, string][]).map(([n, label]) => (
          <div key={label} className="text-center">
            <p className="text-[32px] font-extrabold leading-none text-black tabular-nums">
              {String(n).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-kip-red">{label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 sm:gap-8">
      {([
        [remaining.days,  "DAYS"],
        [remaining.hours, "HOURS"],
        [remaining.mins,  "MINS"],
      ] as [number, string][]).map(([n, label]) => (
        <div key={label} className="text-center">
          <p className="text-xl font-black text-red-600 tabular-nums">{String(n).padStart(2, "0")}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{label}</p>
        </div>
      ))}
    </div>
  );
}
