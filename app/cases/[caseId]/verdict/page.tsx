"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Gavel, CheckCircle2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerdictKernel } from "@/components/dispute/verdict-kernel";
import { ConsensusTrace } from "@/components/dispute/consensus-trace";
import { SettlementRail } from "@/components/dispute/settlement-rail";
import { ManualReviewPanel } from "@/components/dispute/manual-review-panel";
import { useCaseBundle } from "@/lib/genlayer/use-case-bundle";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/genlayer/wallet";
import { statusLabel } from "@/lib/format";
import { ExplorerTxLink } from "@/components/layout/explorer-link";

export default function VerdictChamberPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const caseIdNum = Number(caseId);
  const { disputeCase, app, template, verdict, loading, refetchAll } = useCaseBundle(caseIdNum);
  const { address } = useWallet();
  const isAppOwner = !!address && !!app && address.toLowerCase() === app.owner.toLowerCase();

  const requestVerdict = useContractWrite("request_verdict");
  const finalizeCase = useContractWrite("finalize_case");
  const claimSettlement = useContractWrite("claim_settlement");

  const hasPendingWrite =
    requestVerdict.status === "signing" ||
    requestVerdict.status === "pending" ||
    finalizeCase.status === "signing" ||
    finalizeCase.status === "pending" ||
    claimSettlement.status === "signing" ||
    claimSettlement.status === "pending";

  useEffect(() => {
    if (!hasPendingWrite) return;
    refetchAll();
    const interval = setInterval(refetchAll, 5000);
    return () => clearInterval(interval);
  }, [hasPendingWrite, refetchAll]);

  if (loading || !disputeCase) {
    return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">Loading…</div>;
  }

  async function onRequestVerdict() {
    await requestVerdict.write([caseIdNum]);
    refetchAll();
  }
  async function onFinalize() {
    await finalizeCase.write([caseIdNum]);
    refetchAll();
  }
  async function onClaim() {
    await claimSettlement.write([caseIdNum]);
    refetchAll();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href={`/cases/${caseIdNum}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to case room
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">Verdict Chamber</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Case #{caseIdNum}</h1>
        </div>
        <Badge variant="outline">{statusLabel(disputeCase.status)}</Badge>
      </div>

      {!verdict && disputeCase.status === "evidence_closed" && (
        <div className="mt-8 rounded-lg border border-judgement-cyan/30 bg-judgement-cyan/5 p-6 text-center">
          <Gavel className="mx-auto h-6 w-6 text-judgement-cyan" />
          <p className="mt-2 font-display font-semibold">Evidence is closed. Request the canonical verdict.</p>
          <p className="mt-1 text-sm text-muted">
            request_verdict(case_id) triggers non-deterministic GenLayer validator review.
          </p>
          <Button className="mt-4" onClick={onRequestVerdict} disabled={requestVerdict.status === "signing" || requestVerdict.status === "pending"}>
            {requestVerdict.status === "pending" ? "Validators are reviewing…" : "Request Verdict"}
          </Button>
          {requestVerdict.error && <p className="mt-2 text-sm text-fault-red">{requestVerdict.error}</p>}
          {requestVerdict.txHash && (
            <p className="mt-2 text-xs text-muted">
              <ExplorerTxLink hash={requestVerdict.txHash} />
            </p>
          )}
        </div>
      )}

      {disputeCase.status === "manual_review_required" && template && (
        <div className="mt-8">
          {isAppOwner ? (
            <ManualReviewPanel caseId={caseIdNum} template={template} onResolved={refetchAll} />
          ) : (
            <p className="rounded-lg border border-dashed border-border-strong p-5 text-center text-sm text-muted">
              This case has been flagged for manual review. Only the app owner can resolve it.
            </p>
          )}
        </div>
      )}

      {!verdict && disputeCase.status !== "evidence_closed" && disputeCase.status !== "manual_review_required" && (
        <p className="mt-8 text-sm text-muted">
          A verdict can only be requested once evidence has closed. Current status:{" "}
          {statusLabel(disputeCase.status)}.
        </p>
      )}

      {verdict && (
        <div className="mt-8 space-y-8">
          <VerdictKernel verdict={verdict} />
          <ConsensusTrace verdict={verdict} />
          <SettlementRail disputeCase={disputeCase} verdict={verdict} />

          <div className="flex flex-wrap gap-3">
            {disputeCase.status === "verdict_issued" && (
              <Button variant="outline" onClick={onFinalize} disabled={finalizeCase.status === "pending"}>
                <CheckCircle2 className="h-4 w-4" /> Finalize Case
              </Button>
            )}
            {disputeCase.status === "finalized" && !disputeCase.payout_claimed && (
              <Button variant="amber" onClick={onClaim} disabled={claimSettlement.status === "pending"}>
                <Coins className="h-4 w-4" /> Claim Settlement
              </Button>
            )}
          </div>
          {finalizeCase.error && <p className="text-sm text-fault-red">{finalizeCase.error}</p>}
          {claimSettlement.error && <p className="text-sm text-fault-red">{claimSettlement.error}</p>}
          {disputeCase.status === "verdict_issued" && (
            <p className="text-xs text-muted">
              Want to challenge this? Head to the{" "}
              <Link href={`/cases/${caseIdNum}/appeal`} className="text-judgement-cyan hover:underline">
                appeal dock
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
