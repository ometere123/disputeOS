import { Gavel } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { Verdict } from "@/lib/genlayer/types";
import { EvidenceAlignmentBar } from "./evidence-alignment-bar";
import { RuleFitMeter } from "./rule-fit-meter";
import { BpsSplitGauge } from "./bps-split-gauge";

const VERDICT_TONE: Record<string, "green" | "red" | "amber" | "purple" | "muted"> = {
  complainant_wins: "green",
  respondent_wins: "red",
  split_settlement: "amber",
  partial_refund: "amber",
  redo_required: "purple",
  no_fault: "muted",
  insufficient_evidence: "muted",
  unverifiable: "muted",
  manual_review_required: "purple",
  appeal_granted: "green",
  appeal_rejected: "red",
};

export function VerdictKernel({ verdict }: { verdict: Verdict }) {
  const tone = VERDICT_TONE[verdict.verdict] ?? "muted";
  return (
    <div className="relative overflow-hidden rounded-lg border border-judgement-cyan/30 bg-gradient-to-b from-judgement-cyan/5 to-transparent p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-judgement-cyan/60 animate-scan" />
      <div className="flex items-center gap-2 text-judgement-cyan">
        <Gavel className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Verdict Kernel</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">
        {statusLabel(verdict.verdict)}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge variant={tone}>winner: {verdict.winner}</Badge>
        <Badge variant="outline">confidence {verdict.confidence}%</Badge>
        <Badge variant="outline">{verdict.appeal_allowed ? "appeal allowed" : "appeal not allowed"}</Badge>
        <Badge variant="outline" className="normal-case">
          {verdict.reason_code}
        </Badge>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{verdict.short_reason}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <EvidenceAlignmentBar alignment={verdict.evidence_alignment} />
        <RuleFitMeter fit={verdict.rule_fit} />
      </div>
      <div className="mt-5">
        <BpsSplitGauge complainantBps={verdict.complainant_bps} respondentBps={verdict.respondent_bps} />
      </div>
    </div>
  );
}
