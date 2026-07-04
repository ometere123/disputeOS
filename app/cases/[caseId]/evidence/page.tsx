"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvidencePort } from "@/components/dispute/evidence-port";
import { useCaseBundle } from "@/lib/genlayer/use-case-bundle";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/genlayer/wallet";
import { statusLabel, timeUntil } from "@/lib/format";

export default function EvidenceIntakePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const caseIdNum = Number(caseId);
  const { disputeCase, evidence, loading, refetchAll } = useCaseBundle(caseIdNum);
  const { address } = useWallet();

  const submitEvidence = useContractWrite("submit_evidence");
  const respondToCase = useContractWrite("respond_to_case");
  const closeEvidence = useContractWrite("close_evidence");

  const [evidenceType, setEvidenceType] = useState("link");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [responseStatement, setResponseStatement] = useState("");

  const hasPendingWrite =
    submitEvidence.status === "signing" ||
    submitEvidence.status === "pending" ||
    respondToCase.status === "signing" ||
    respondToCase.status === "pending" ||
    closeEvidence.status === "signing" ||
    closeEvidence.status === "pending";

  useEffect(() => {
    if (!hasPendingWrite) return;
    refetchAll();
    const interval = setInterval(refetchAll, 5000);
    return () => clearInterval(interval);
  }, [hasPendingWrite, refetchAll]);

  if (loading || !disputeCase) {
    return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">Loading…</div>;
  }

  const connectedAddress = address?.toLowerCase();
  const isComplainant = connectedAddress === disputeCase.complainant.toLowerCase();
  const isRespondent = connectedAddress === disputeCase.respondent.toLowerCase();
  const canSubmit = (isComplainant || isRespondent) && disputeCase.status === "evidence_open";
  const role = isComplainant ? "complainant" : "respondent";

  async function onSubmitEvidence(e: React.FormEvent) {
    e.preventDefault();
    await submitEvidence.write([caseIdNum, evidenceType, title, statement, publicUrl]);
    setTitle("");
    setStatement("");
    setPublicUrl("");
    refetchAll();
  }

  async function onRespond(e: React.FormEvent) {
    e.preventDefault();
    await respondToCase.write([caseIdNum, responseStatement]);
    refetchAll();
  }

  async function onCloseEvidence() {
    await closeEvidence.write([caseIdNum]);
    refetchAll();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href={`/cases/${caseIdNum}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to case room
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">Evidence Intake</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Case #{caseIdNum}</h1>
        </div>
        <Badge variant="outline">{statusLabel(disputeCase.status)}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">
        Deadline {timeUntil(disputeCase.evidence_deadline)} · up to 8 items per party
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Complainant evidence</p>
          <div className="mt-3 space-y-2">
            {evidence.filter((e) => e.submitted_by === disputeCase.complainant).map((e) => (
              <EvidencePort key={e.evidence_id} evidence={e} role="complainant" />
            ))}
            {evidence.filter((e) => e.submitted_by === disputeCase.complainant).length === 0 && (
              <p className="text-xs text-muted">No evidence submitted yet.</p>
            )}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Respondent evidence</p>
          <div className="mt-3 space-y-2">
            {evidence.filter((e) => e.submitted_by === disputeCase.respondent).map((e) => (
              <EvidencePort key={e.evidence_id} evidence={e} role="respondent" />
            ))}
            {evidence.filter((e) => e.submitted_by === disputeCase.respondent).length === 0 && (
              <p className="text-xs text-muted">No evidence submitted yet.</p>
            )}
          </div>
        </div>
      </div>

      {isRespondent && !disputeCase.respondent_response && disputeCase.status === "evidence_open" && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Respondent statement</CardTitle>
            <CardDescription>respond_to_case(case_id, response_statement)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onRespond} className="space-y-3">
              <Textarea value={responseStatement} onChange={(e) => setResponseStatement(e.target.value)} placeholder="Respond to the complainant's claim…" required />
              <Button type="submit" disabled={respondToCase.status === "pending"}>
                {respondToCase.status === "pending" ? "Submitting…" : "Submit Response"}
              </Button>
              {respondToCase.error && <p className="text-sm text-fault-red">{respondToCase.error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {canSubmit && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Submit evidence ({role})</CardTitle>
            <CardDescription>submit_evidence(case_id, evidence_type, title, statement, public_url)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmitEvidence} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="evidenceType">Type</Label>
                  <Input id="evidenceType" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label htmlFor="statement">Statement (20-2000 chars)</Label>
                <Textarea id="statement" value={statement} onChange={(e) => setStatement(e.target.value)} required minLength={20} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="publicUrl">Public URL</Label>
                <Input id="publicUrl" value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} placeholder="https://…" required className="mt-1.5" />
              </div>
              <Button type="submit" disabled={submitEvidence.status === "pending"}>
                {submitEvidence.status === "pending" ? "Submitting…" : "Submit Evidence"}
              </Button>
              {submitEvidence.error && <p className="text-sm text-fault-red">{submitEvidence.error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {disputeCase.status === "evidence_open" && (
        <div className="mt-8 flex items-center justify-between rounded-lg border border-border bg-panel-ash/40 p-4">
          <p className="text-sm text-muted">
            Once both sides are done, close the window to move into validator review.
          </p>
          <Button variant="outline" onClick={onCloseEvidence} disabled={closeEvidence.status === "pending"}>
            <Lock className="h-4 w-4" /> Close Evidence
          </Button>
        </div>
      )}
    </div>
  );
}
