"use client";

import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { COMMITTEE_NOTES_MIN, TcDecision } from "@kip/shared";
import { DecisionForm, type DecisionOption } from "@/components/committee/decision-form";

const OPTIONS: DecisionOption[] = [
  {
    value: TcDecision.SHORTLIST,
    label: "Shortlist",
    icon: CheckCircle2,
    activeClass: "border-green-500 bg-green-50 text-green-700",
    placeholder: "Confirm the application meets the TC criteria and should go to the Land Allocation Committee…",
    submitLabel: "Shortlist for LAC review",
  },
  {
    value: TcDecision.NOT_SHORTLIST,
    label: "Not shortlisted",
    icon: XCircle,
    activeClass: "border-red-400 bg-red-50 text-red-700",
    placeholder: "State the specific deficiencies or non-compliance that rule the application out…",
    submitLabel: "Record not shortlisted",
  },
  {
    value: TcDecision.REQUEST_INFO,
    label: "Request more info",
    icon: MessageSquare,
    activeClass: "border-amber-400 bg-amber-50 text-amber-700",
    placeholder: "Write the question for the investor. They see this text exactly as written…",
    submitLabel: "Send request to investor",
  },
];

/** The TC's single decision on an application. */
export function TcDecisionForm({ applicationId }: { applicationId: string }) {
  return (
    <DecisionForm
      title="Record the TC decision"
      description="Shortlisting sends the application straight to the Land Allocation Committee. A request for more information is emailed to the investor."
      method="POST"
      path={`/reviews/${applicationId}/tc-decision`}
      field="decision"
      options={OPTIONS}
      minNotes={COMMITTEE_NOTES_MIN}
      final
      successText="Decision recorded."
    />
  );
}
