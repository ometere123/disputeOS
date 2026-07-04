"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCaseBundle } from "@/lib/genlayer/use-case-bundle";
import { shortAddress, statusLabel, formatGen, bpsToPercent } from "@/lib/format";

interface CaseStatusWidgetProps {
  caseId: number;
  compact?: boolean;
}

const STATUS_TONE: Record<string, "default" | "green" | "amber" | "red" | "purple" | "outline"> = {
  case_opened: "default",
  case_funded: "default",
  evidence_open: "amber",
  evidence_closed: "amber",
  under_validator_review: "purple",
  verdict_issued: "green",
  appeal_window_open: "amber",
  appeal_under_review: "purple",
  finalized: "green",
  settled: "green",
  cancelled: "red",
  expired: "red",
  insufficient_evidence: "outline",
  manual_review_required: "purple",
  unverifiable: "outline",
  settlement_failed: "red",
};

export function CaseStatusWidget({ caseId, compact = false }: CaseStatusWidgetProps) {
  const { disputeCase, app, template, verdict, loading, error } = useCaseBundle(caseId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (error || !disputeCase) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{error ?? "Case not found"}</p>
        </CardContent>
      </Card>
    );
  }

  const tone = STATUS_TONE[disputeCase.status] ?? "outline";

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel-ash/40 px-3 py-2">
        <Badge variant={tone}>{statusLabel(disputeCase.status)}</Badge>
        <span className="font-mono text-xs text-muted">{template?.case_type ?? "..."}</span>
        <span className="text-xs text-muted">|</span>
        <span className="font-mono text-xs">{shortAddress(disputeCase.complainant)}</span>
        <span className="text-xs text-muted">vs</span>
        <span className="font-mono text-xs">{shortAddress(disputeCase.respondent)}</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Case #{caseId}</p>
          <p className="font-display text-lg font-semibold">{app?.name ?? "App"}</p>
        </div>
        <Badge variant={tone}>{statusLabel(disputeCase.status)}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Case Type</p>
            <p className="mt-1 font-mono">{template?.case_type ?? "..."}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Funding</p>
            <p className="mt-1 font-mono text-dispute-amber">
              {formatGen(disputeCase.settlement_amount)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Complainant</p>
            <p className="mt-1 font-mono">{shortAddress(disputeCase.complainant)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Respondent</p>
            <p className="mt-1 font-mono">{shortAddress(disputeCase.respondent)}</p>
          </div>
        </div>
        {verdict && (
          <div className="rounded-md border border-judgement-cyan/30 bg-judgement-cyan/5 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-judgement-cyan">Verdict</p>
            <p className="mt-1 font-display text-sm font-medium">{statusLabel(verdict.verdict)}</p>
            <p className="mt-1 font-mono text-xs text-muted">
              {bpsToPercent(verdict.complainant_bps)} / {bpsToPercent(verdict.respondent_bps)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
