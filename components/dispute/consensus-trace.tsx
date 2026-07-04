import { Network } from "lucide-react";
import { confidenceBand, settlementBandLabel } from "@/lib/genlayer/bands";
import type { Verdict } from "@/lib/genlayer/types";

export function ConsensusTrace({ verdict }: { verdict: Verdict }) {
  const rows = [
    { label: "Verdict category", value: verdict.verdict },
    { label: "Winner category", value: verdict.winner },
    { label: "Settlement band", value: settlementBandLabel(verdict.complainant_bps) },
    { label: "Evidence alignment band", value: verdict.evidence_alignment },
    { label: "Rule fit band", value: verdict.rule_fit },
    { label: "Appeal permission", value: verdict.appeal_allowed ? "allowed" : "not allowed" },
    { label: "Confidence band", value: confidenceBand(verdict.confidence) },
    { label: "Reason code category", value: verdict.reason_code },
  ];

  return (
    <div className="rounded-lg border border-border bg-panel-ash/40 p-5">
      <div className="flex items-center gap-2 text-muted">
        <Network className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
          Consensus Trace: Equivalence Principle
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">
        Validators don&apos;t compare raw text. They normalize the leader&apos;s answer into these
        bands and only need to agree on the band, not the exact wording or exact basis points.
      </p>
      <dl className="mt-4 divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 text-sm">
            <dt className="text-muted">{row.label}</dt>
            <dd className="font-mono text-judgement-cyan">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
