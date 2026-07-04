import { ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { shortAddress, bpsToPercent, formatGen } from "@/lib/format";
import { useContractRead } from "@/lib/genlayer/hooks";
import type { DisputeCase, ProtocolFeeInfo, Verdict } from "@/lib/genlayer/types";

export function SettlementRail({
  disputeCase,
  verdict,
}: {
  disputeCase: Pick<DisputeCase, "settlement_amount" | "complainant" | "respondent" | "payout_claimed" | "status">;
  verdict: Pick<Verdict, "complainant_bps" | "respondent_bps"> | null;
}) {
  const { data: feeInfo } = useContractRead<ProtocolFeeInfo>("get_protocol_fee_info", []);
  const feeBps = feeInfo?.fee_bps ?? 0;

  const total = parseFloat(disputeCase.settlement_amount || "0");
  const distributable = total * (1 - feeBps / 10000);
  const feeAmount = total - distributable;
  const complainantAmount = verdict ? (distributable * verdict.complainant_bps) / 10000 : 0;
  const respondentAmount = verdict ? (distributable * verdict.respondent_bps) / 10000 : 0;

  return (
    <div className="rounded-lg border border-settlement-green/30 bg-settlement-green/5 p-5">
      <div className="flex items-center gap-2 text-settlement-green">
        <Lock className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Settlement Rail</span>
      </div>
      <p className="mt-2 font-display text-lg font-semibold">{formatGen(total)} escrowed</p>
      {feeBps > 0 && (
        <p className="mt-1 font-mono text-xs text-muted">
          Protocol fee {bpsToPercent(feeBps)} ({formatGen(feeAmount)}) is deducted before the split below.
        </p>
      )}
      <div className="mt-4 space-y-3">
        <RailRow
          label="Complainant"
          address={disputeCase.complainant}
          amount={complainantAmount}
          bps={verdict?.complainant_bps ?? 0}
        />
        <RailRow
          label="Respondent"
          address={disputeCase.respondent}
          amount={respondentAmount}
          bps={verdict?.respondent_bps ?? 0}
        />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs">
        {disputeCase.payout_claimed ? (
          <span className="inline-flex items-center gap-1 text-settlement-green">
            <CheckCircle2 className="h-3.5 w-3.5" /> settlement claimed
          </span>
        ) : (
          <span className="text-muted">awaiting claim_settlement()</span>
        )}
      </div>
    </div>
  );
}

function RailRow({
  label,
  address,
  amount,
  bps,
}: {
  label: string;
  address: string;
  amount: number;
  bps: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-void-black/40 px-3 py-2">
      <div>
        <p className="font-display text-sm">{label}</p>
        <p className="font-mono text-xs text-muted">{shortAddress(address)}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted" />
      <div className="text-right">
        <p className="font-mono text-sm text-settlement-green">{formatGen(amount)}</p>
        <p className="font-mono text-[10px] text-muted">{bpsToPercent(bps)}</p>
      </div>
    </div>
  );
}
