"use client";

import { useState } from "react";
import { Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { ExplorerTxLink } from "@/components/layout/explorer-link";
import type { DisputeTemplate, VerdictCategory, Winner } from "@/lib/genlayer/types";

const WINNERS: Winner[] = ["complainant", "respondent", "split", "none"];

interface ManualReviewPanelProps {
  caseId: number;
  template: DisputeTemplate;
  onResolved?: () => void;
}

// Only shown to the app owner once a case has fallen into
// "manual_review_required", the human backstop for the cases the
// validator model itself could not confidently decide.
export function ManualReviewPanel({ caseId, template, onResolved }: ManualReviewPanelProps) {
  const [verdict, setVerdict] = useState<VerdictCategory | "">("");
  const [winner, setWinner] = useState<Winner | "">("");
  const [complainantBps, setComplainantBps] = useState("5000");
  const [reasonCode, setReasonCode] = useState("");
  const [shortReason, setShortReason] = useState("");

  const resolveManualReview = useContractWrite("resolve_manual_review");

  const complainantBpsNum = Math.max(0, Math.min(10000, Number(complainantBps) || 0));
  const respondentBpsNum = 10000 - complainantBpsNum;

  const canSubmit = verdict !== "" && winner !== "" && reasonCode.trim().length > 0 && shortReason.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    await resolveManualReview.write([
      caseId,
      verdict,
      winner,
      complainantBpsNum,
      respondentBpsNum,
      reasonCode,
      shortReason,
    ]);
    onResolved?.();
  }

  return (
    <div className="rounded-lg border border-fault-red/40 bg-fault-red/5 p-6">
      <div className="flex items-center gap-2 text-fault-red">
        <Gavel className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Manual Review Panel: App Owner Only</span>
      </div>
      <p className="mt-2 text-sm text-foreground/85">
        The validator layer could not confidently resolve this case. As the app owner you can issue a
        binding manual verdict. This bypasses the appeal window and finalizes the case immediately.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">Verdict</Label>
          <Select value={verdict} onValueChange={(v) => setVerdict(v as VerdictCategory)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select verdict" />
            </SelectTrigger>
            <SelectContent>
              {template.allowed_verdicts.map((v) => (
                <SelectItem key={v} value={v}>
                  {v.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">Winner</Label>
          <Select value={winner} onValueChange={(v) => setWinner(v as Winner)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select winner" />
            </SelectTrigger>
            <SelectContent>
              {WINNERS.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Complainant Split (bps)
          </Label>
          <Input
            type="number"
            min={0}
            max={10000}
            value={complainantBps}
            onChange={(e) => setComplainantBps(e.target.value)}
            className="mt-1 font-mono"
          />
          <p className="mt-1 font-mono text-[10px] text-muted">
            Respondent gets {respondentBpsNum} bps ({(respondentBpsNum / 100).toFixed(0)}%)
          </p>
        </div>
        <div>
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">Reason Code</Label>
          <Input
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            placeholder="manual_resolution_owner_call"
            className="mt-1 font-mono"
          />
        </div>
      </div>

      <div className="mt-3">
        <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">Short Reason</Label>
        <Textarea
          value={shortReason}
          onChange={(e) => setShortReason(e.target.value)}
          rows={2}
          maxLength={240}
          placeholder="Explain the basis for this manual decision..."
          className="mt-1"
        />
      </div>

      {resolveManualReview.error && <p className="mt-2 text-sm text-fault-red">{resolveManualReview.error}</p>}
      {resolveManualReview.txHash && (
        <p className="mt-2 text-xs text-muted">
          <ExplorerTxLink hash={resolveManualReview.txHash} />
        </p>
      )}

      <Button
        className="mt-4"
        variant="destructive"
        disabled={!canSubmit || resolveManualReview.status === "signing" || resolveManualReview.status === "pending"}
        onClick={handleSubmit}
      >
        {resolveManualReview.status === "pending" ? "Submitting manual verdict…" : "Resolve Manual Review"}
      </Button>
    </div>
  );
}
