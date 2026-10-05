"use client";

import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import {
  COMMITTEE_NOTES_MIN,
  LacDecision,
  LacRecommendation,
  type LacRecommendation as LacRecommendationValue,
} from "@kip/shared";
import { DecisionForm, type DecisionOption } from "@/components/committee/decision-form";

const RECOMMENDATION_OPTIONS: DecisionOption[] = [
  {
    value: LacRecommendation.APPROVE,
    label: "Approve",
    icon: CheckCircle2,
    activeClass: "border-green-500 bg-green-50 text-green-700",
    placeholder: "Why the land request suits the park: zoning, acreage, infrastructure, investment case…",
    submitLabel: "Save my recommendation",
  },
  {
    value: LacRecommendation.REJECT,
    label: "Reject",
    icon: XCircle,
    activeClass: "border-red-400 bg-red-50 text-red-700",
    placeholder: "What makes the request unsuitable…",
    submitLabel: "Save my recommendation",
  },
  {
    value: LacRecommendation.MORE_INFO,
    label: "More info needed",
    icon: MessageSquare,
    activeClass: "border-amber-400 bg-amber-50 text-amber-700",
    placeholder: "What the committee should ask the investor before deciding…",
    submitLabel: "Save my recommendation",
  },
];

const DECISION_OPTIONS: DecisionOption[] = [
  {
    value: LacDecision.APPROVE,
    label: "Approve",
    icon: CheckCircle2,
    activeClass: "border-green-500 bg-green-50 text-green-700",
    placeholder: "The committee's reasons for approving. This goes to ExCo with the application…",
    submitLabel: "Approve and send to ExCo",
  },
  {
    value: LacDecision.REJECT,
    label: "Reject",
    icon: XCircle,
    activeClass: "border-red-400 bg-red-50 text-red-700",
    placeholder: "The committee's reasons for rejecting…",
    submitLabel: "Record rejection",
  },
  {
    value: LacDecision.REQUEST_INFO,
    label: "Request more info",
    icon: MessageSquare,
    activeClass: "border-amber-400 bg-amber-50 text-amber-700",
    placeholder: "Write the question for the investor. They see this text exactly as written…",
    submitLabel: "Send request to investor",
  },
];

/** One LAC member's own recommendation — revisable until the committee decides. */
export function LacReviewForm({
  applicationId,
  initial,
}: {
  applicationId: string;
  initial: { recommendation: LacRecommendationValue; notes: string } | null;
}) {
  return (
    <DecisionForm
      title={initial ? "Your recommendation" : "Record your recommendation"}
      description="Your view as a committee member. Other members can see it, and you can change it until the committee records its decision."
      method="PUT"
      path={`/reviews/${applicationId}/lac-review`}
      field="recommendation"
      options={RECOMMENDATION_OPTIONS}
      minNotes={COMMITTEE_NOTES_MIN}
      initial={initial ? { value: initial.recommendation, notes: initial.notes } : null}
      successText="Recommendation saved."
    />
  );
}

/** The committee's single final decision. */
export function LacDecisionForm({ applicationId }: { applicationId: string }) {
  return (
    <DecisionForm
      title="Record the committee's decision"
      description="Record this once the committee has agreed. Approval sends the application to ExCo. LAC outcomes are not emailed to the investor."
      method="POST"
      path={`/reviews/${applicationId}/lac-decision`}
      field="decision"
      options={DECISION_OPTIONS}
      minNotes={COMMITTEE_NOTES_MIN}
      final
      successText="Decision recorded."
    />
  );
}
