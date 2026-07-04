"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCaseBundle } from "@/lib/genlayer/use-case-bundle";
import { useContractWrite } from "@/lib/genlayer/hooks";

interface EvidenceSubmissionWidgetProps {
  caseId: number;
  onSubmitted?: (evidenceId: number) => void;
}

export function EvidenceSubmissionWidget({ caseId, onSubmitted }: EvidenceSubmissionWidgetProps) {
  const { disputeCase, evidence, loading, refetchAll } = useCaseBundle(caseId);
  const { write, status, error: writeError, reset } = useContractWrite("submit_evidence");

  const [evidenceType, setEvidenceType] = useState("");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [publicUrl, setPublicUrl] = useState("");

  const evidenceOpen =
    disputeCase?.status === "evidence_open" || disputeCase?.status === "case_funded";
  const isBusy = status === "signing" || status === "pending";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!evidenceOpen || isBusy) return;
    reset();
    try {
      await write([caseId, evidenceType, title, statement, publicUrl]);
      setEvidenceType("");
      setTitle("");
      setStatement("");
      setPublicUrl("");
      refetchAll();
      if (onSubmitted) {
        onSubmitted(evidence.length + 1);
      }
    } catch {
      // error is surfaced via writeError
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Evidence Submission
          </p>
          <p className="mt-1 text-sm text-muted">
            {loading ? "..." : `${evidence.length} item${evidence.length !== 1 ? "s" : ""} submitted`}
          </p>
        </div>
        <Badge variant={evidenceOpen ? "green" : "red"}>
          {evidenceOpen ? "Evidence Open" : "Evidence Closed"}
        </Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`ew-type-${caseId}`} className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Evidence Type
              </Label>
              <Input
                id={`ew-type-${caseId}`}
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                placeholder="screenshot, receipt, log..."
                disabled={!evidenceOpen || isBusy}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`ew-title-${caseId}`} className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Title
              </Label>
              <Input
                id={`ew-title-${caseId}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title"
                disabled={!evidenceOpen || isBusy}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`ew-stmt-${caseId}`} className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Statement
            </Label>
            <Textarea
              id={`ew-stmt-${caseId}`}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Describe the evidence..."
              disabled={!evidenceOpen || isBusy}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`ew-url-${caseId}`} className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Public URL
            </Label>
            <Input
              id={`ew-url-${caseId}`}
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="https://..."
              disabled={!evidenceOpen || isBusy}
              className="mt-1"
            />
          </div>
          {writeError && <p className="text-xs text-red-400">{writeError}</p>}
          <Button
            type="submit"
            disabled={!evidenceOpen || isBusy || !title || !statement}
            className="w-full"
          >
            {isBusy ? "Submitting..." : "Submit Evidence"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
