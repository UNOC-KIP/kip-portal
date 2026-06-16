"use client";

import { useState } from "react";
import { Bot, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "idle" | "running" | "done";

export function AiScreeningButton() {
  const [state, setState] = useState<State>("idle");
  const [completedAt, setCompletedAt] = useState<string>("");

  const run = async () => {
    setState("running");
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setCompletedAt(now);
    setState("done");
  };

  if (state === "done") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-600">
        <CheckCircle2 size={13} />
        AI screening completed · {completedAt}
      </span>
    );
  }

  if (state === "running") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-ink-500">
        <Loader2 size={13} className="animate-spin" />
        Running AI screening…
      </span>
    );
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={run}>
      <Bot size={14} />
      Run AI Screening
    </Button>
  );
}
