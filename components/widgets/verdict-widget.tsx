"use client";

import { Gavel } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCaseBundle } from "@/lib/genlayer/use-case-bundle";
import { statusLabel, bpsToPercent } from "@/lib/format";

interface VerdictWidgetProps {
  caseId: number;
  showConsensusTrace?: boolean;
}

const VERDICT_TONE: Record<string, "green" | "red" | "amber" | "purple" | "outline"> = {
  complainant_wins: "green",
  respondent_wins: "red",
  split_settlement: "amber",
  partial_refund: "amber",
  redo_required: "purple",
  no_fault: "outline",
  insufficient_evidence: "outline",
  unverifiable: "outline",
  manual_review_required: "purple",
  appeal_granted: "green",
  appeal_rejected: "red",
};

export function VerdictWidget({ caseId, showConsensusTrace = false }: VerdictWidgetProps) {
  const { verdict, loading, error } = useCaseBundle(caseId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!verdict) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Gavel className="h-4 w-4 text-muted" />
          <p className="font-mono text-sm text-muted">Awaiting verdict</p>
        </CardContent>
      </Card>
    );
  }

  const tone = VERDICT_TONE[verdict.verdict] ?? "outline";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-judgement-cyan">
          <Gavel className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Verdict</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-display text-xl font-bold tracking-tight">
          {statusLabel(verdict.verdict)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant={tone}>winner: {verdict.winner}</Badge>
          <Badge variant="outline">confidence {verdict.confidence}%</Badge>
          <Badge variant="outline">{verdict.appeal_allowed ? "appeal allowed" : "no appeal"}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Complainant Split
            </p>
            <p className="mt-1 font-mono">{bpsToPercent(verdict.complainant_bps)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Respondent Split
            </p>
            <p className="mt-1 font-mono">{bpsToPercent(verdict.respondent_bps)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Evidence Alignment
            </p>
            <p className="mt-1 font-mono">{verdict.evidence_alignment}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Rule Fit</p>
            <p className="mt-1 font-mono">{verdict.rule_fit}</p>
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Reason Code</p>
          <p className="mt-1 font-mono text-sm">{verdict.reason_code}</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{verdict.short_reason}</p>
        {showConsensusTrace && (
          <div className="rounded-md border border-border bg-void-black/40 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Consensus Trace
            </p>
            <p className="mt-1 font-mono text-xs text-muted">
              issued at block timestamp {verdict.issued_at}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
