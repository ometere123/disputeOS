"use client";

import { Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCaseBundle } from "@/lib/genlayer/use-case-bundle";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/genlayer/wallet";
import { shortAddress, formatGen, bpsToPercent } from "@/lib/format";

interface SettlementWidgetProps {
  caseId: number;
  onClaimed?: () => void;
}

export function SettlementWidget({ caseId, onClaimed }: SettlementWidgetProps) {
  const { disputeCase, verdict, loading, error, refetchAll } = useCaseBundle(caseId);
  const { address } = useWallet();
  const { write, status, error: writeError, reset } = useContractWrite("claim_settlement");

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

  if (error || !disputeCase) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{error ?? "Case not found"}</p>
        </CardContent>
      </Card>
    );
  }

  const total = parseFloat(disputeCase.settlement_amount || "0");
  const complainantAmount = verdict ? (total * verdict.complainant_bps) / 10000 : 0;
  const respondentAmount = verdict ? (total * verdict.respondent_bps) / 10000 : 0;

  const isFinalized =
    disputeCase.status === "finalized" || disputeCase.status === "settled";
  const isParty =
    address &&
    (address.toLowerCase() === disputeCase.complainant.toLowerCase() ||
      address.toLowerCase() === disputeCase.respondent.toLowerCase());
  const canClaim = isFinalized && !disputeCase.payout_claimed && isParty;

  const isBusy = status === "signing" || status === "pending";

  async function handleClaim() {
    reset();
    try {
      await write([caseId]);
      refetchAll();
      if (onClaimed) onClaimed();
    } catch {
      // error surfaced via writeError
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-settlement-green">
          <Lock className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Settlement</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-display text-lg font-semibold">{formatGen(total)} escrowed</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md bg-void-black/40 px-3 py-2">
            <div>
              <p className="font-display text-sm">Complainant</p>
              <p className="font-mono text-xs text-muted">{shortAddress(disputeCase.complainant)}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-settlement-green">{formatGen(complainantAmount)}</p>
              <p className="font-mono text-[10px] text-muted">
                {bpsToPercent(verdict?.complainant_bps ?? 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-void-black/40 px-3 py-2">
            <div>
              <p className="font-display text-sm">Respondent</p>
              <p className="font-mono text-xs text-muted">{shortAddress(disputeCase.respondent)}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-settlement-green">{formatGen(respondentAmount)}</p>
              <p className="font-mono text-[10px] text-muted">
                {bpsToPercent(verdict?.respondent_bps ?? 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-3 text-xs">
          {disputeCase.payout_claimed ? (
            <span className="inline-flex items-center gap-1 text-settlement-green">
              <CheckCircle2 className="h-3.5 w-3.5" /> Settlement claimed
            </span>
          ) : isFinalized ? (
            <Badge variant="amber">Awaiting claim</Badge>
          ) : (
            <span className="text-muted">Case not yet finalized</span>
          )}
        </div>
        {writeError && <p className="text-xs text-red-400">{writeError}</p>}
        {canClaim && (
          <Button onClick={handleClaim} disabled={isBusy} className="w-full">
            {isBusy ? "Claiming..." : "Claim Settlement"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
