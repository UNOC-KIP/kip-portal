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
  };
}

export function CountdownTimer({ closeAt }: { closeAt: string }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(closeAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(calcRemaining(closeAt)), 30_000);
    return () => clearInterval(id);
  }, [closeAt]);

  if (!remaining) {
    return (
      <p className="text-sm font-semibold text-red-600">Window is closed</p>
    );
  }

  return (
    <div className="flex items-center gap-6 sm:gap-8">
      {[
        [remaining.days,  "DAYS"],
        [remaining.hours, "HOURS"],
        [remaining.mins,  "MINS"],
      ].map(([n, label]) => (
        <div key={label as string} className="text-center">
          <p className="text-xl font-black text-red-600">{String(n).padStart(2, "0")}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
