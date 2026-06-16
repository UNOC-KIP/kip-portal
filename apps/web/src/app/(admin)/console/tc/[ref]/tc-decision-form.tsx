"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Decision = "approve" | "reject" | "request-info";

const OPTIONS: {
  value: Decision;
  label: string;
  icon: React.ElementType;
  activeClass: string;
  placeholder: string;
}[] = [
  {
    value: "approve",
    label: "Approve",
    icon: CheckCircle2,
    activeClass:
      "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200",
    placeholder:
      "Confirm that the application meets all TC criteria and is ready to proceed to the PI stage…",
  },
  {
    value: "reject",
    label: "Reject",
    icon: XCircle,
    activeClass:
      "border-red-400 bg-red-50 text-red-700 ring-2 ring-red-200",
    placeholder:
      "State the specific deficiencies or non-compliance issues that led to rejection…",
  },
  {
    value: "request-info",
    label: "Request More Info",
    icon: MessageSquare,
    activeClass:
      "border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-200",
    placeholder:
      "Describe what additional information or documentation is needed from the applicant before a decision can be made…",
  },
];

const CONFIRM_LABEL: Record<Decision, string> = {
  approve: "Confirm Approval",
  reject: "Confirm Rejection",
  "request-info": "Send Information Request",
};

export function TcDecisionForm() {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [justification, setJustification] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    const chosen = OPTIONS.find((o) => o.value === decision)!;
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 py-8 text-center">
        <CheckCircle2 size={32} className="text-green-500" />
        <p className="text-sm font-bold text-green-800">
          Decision recorded: {chosen.label}
        </p>
        <p className="max-w-sm text-xs text-green-700">
          The TC decision has been saved and the applicant will be notified
          according to the standard KIP communication schedule.
        </p>
      </div>
    );
  }

  const active = OPTIONS.find((o) => o.value === decision);

  return (
    <div className="rounded-xl border-2 border-ink-200 bg-white p-6">
      <h2 className="mb-1 text-sm font-bold text-ink-900">
        Record TC Decision
      </h2>
      <p className="mb-5 text-xs text-ink-500">
        Select a decision and provide a written justification before confirming.
      </p>

      <div className="mb-5 flex flex-wrap gap-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = decision === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                setDecision(opt.value);
                setJustification("");
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all",
                isSelected
                  ? opt.activeClass
                  : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
              )}
            >
              <Icon size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-ink-700">
            Justification / Notes
            <span className="ml-1 font-normal text-ink-400">(required)</span>
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder={active.placeholder}
            rows={5}
            className="w-full resize-none rounded-lg border border-ink-200 p-3 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <Button
            className="w-full py-5 text-sm font-bold"
            onClick={() => setSubmitted(true)}
            disabled={justification.trim().length < 20}
          >
            {CONFIRM_LABEL[decision!]}
          </Button>
          {justification.trim().length > 0 &&
            justification.trim().length < 20 && (
              <p className="text-center text-xs text-ink-400">
                Please provide at least 20 characters.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
