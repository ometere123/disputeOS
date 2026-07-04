"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { genToWei } from "@/lib/format";

interface OpenDisputeButtonProps {
  appId: number;
  templateId: number;
  respondent?: string;
  buttonLabel?: string;
  onCaseOpened?: (caseId: number) => void;
}

export function OpenDisputeButton({
  appId,
  templateId,
  respondent: defaultRespondent = "",
  buttonLabel = "Open Dispute",
  onCaseOpened,
}: OpenDisputeButtonProps) {
  const [open, setOpen] = useState(false);
  const [respondent, setRespondent] = useState(defaultRespondent);
  const [caseSummary, setCaseSummary] = useState("");
  const [requestedRemedy, setRequestedRemedy] = useState("");
  const [evidenceDeadline, setEvidenceDeadline] = useState("");
  const [fundingAmount, setFundingAmount] = useState("");
  const [step, setStep] = useState<"form" | "opening" | "funding" | "done" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");

  const openCase = useContractWrite("open_case");
  const fundCase = useContractWrite("fund_case");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("opening");
    setErrorMsg("");
    try {
      // Parse deadline as hours from now -> unix timestamp
      const deadlineHours = parseInt(evidenceDeadline, 10) || 72;
      const deadlineTs = Math.floor(Date.now() / 1000) + deadlineHours * 3600;

      const receipt = await openCase.write([
        appId,
        templateId,
        respondent,
        caseSummary,
        requestedRemedy,
        deadlineTs,
      ]);

      // The case_id is the return value from the contract. For now we
      // derive it from the receipt or use a placeholder.
      const caseId = (receipt as { data?: { result?: number } })?.data?.result ?? 0;

      if (fundingAmount && parseFloat(fundingAmount) > 0) {
        setStep("funding");
        await fundCase.write([caseId], genToWei(fundingAmount));
      }

      setStep("done");
      if (onCaseOpened) onCaseOpened(caseId);
    } catch (err) {
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed.");
    }
  }

  function resetForm() {
    setStep("form");
    setErrorMsg("");
    setCaseSummary("");
    setRequestedRemedy("");
    setEvidenceDeadline("");
    setFundingAmount("");
    openCase.reset();
    fundCase.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>{buttonLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Open a Dispute</DialogTitle>
        </DialogHeader>

        {step === "done" ? (
          <div className="space-y-3 py-4 text-center">
            <p className="font-display text-lg font-semibold text-settlement-green">
              Dispute opened
            </p>
            <p className="text-sm text-muted">Your case has been filed and funded.</p>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Respondent Address
              </Label>
              <Input
                value={respondent}
                onChange={(e) => setRespondent(e.target.value)}
                placeholder="0x..."
                disabled={step !== "form"}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Case Summary
              </Label>
              <Textarea
                value={caseSummary}
                onChange={(e) => setCaseSummary(e.target.value)}
                placeholder="Describe the dispute..."
                disabled={step !== "form"}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Requested Remedy
              </Label>
              <Input
                value={requestedRemedy}
                onChange={(e) => setRequestedRemedy(e.target.value)}
                placeholder="Full refund, partial credit..."
                disabled={step !== "form"}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Evidence Deadline (hrs)
                </Label>
                <Input
                  type="number"
                  value={evidenceDeadline}
                  onChange={(e) => setEvidenceDeadline(e.target.value)}
                  placeholder="72"
                  disabled={step !== "form"}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Funding (GEN)
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={fundingAmount}
                  onChange={(e) => setFundingAmount(e.target.value)}
                  placeholder="0"
                  disabled={step !== "form"}
                  className="mt-1"
                />
              </div>
            </div>

            {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

            <Button
              type="submit"
              disabled={step !== "form" || !respondent || !caseSummary}
              className="w-full"
            >
              {step === "opening"
                ? "Opening case..."
                : step === "funding"
                  ? "Funding case..."
                  : "Submit Dispute"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
