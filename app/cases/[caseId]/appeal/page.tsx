"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppealDock } from "@/components/dispute/appeal-dock";
import { useCaseBundle } from "@/lib/genlayer/use-case-bundle";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/genlayer/wallet";
import { statusLabel } from "@/lib/format";
import { APPEAL_BASES } from "@/lib/genlayer/types";

export default function AppealDockPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const caseIdNum = Number(caseId);
  const { disputeCase, verdict, appeal, template, loading, refetchAll } = useCaseBundle(caseIdNum);
  const { address } = useWallet();

  const fileAppeal = useContractWrite("file_appeal");
  const requestAppealReview = useContractWrite("request_appeal_review");

  const [basis, setBasis] = useState<string>(APPEAL_BASES[0]);
  const [statement, setStatement] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");

  const hasPendingWrite =
    fileAppeal.status === "signing" ||
    fileAppeal.status === "pending" ||
    requestAppealReview.status === "signing" ||
    requestAppealReview.status === "pending";

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
  const isParty =
    !!connectedAddress &&
    [disputeCase.complainant, disputeCase.respondent]
      .map((party) => party.toLowerCase())
      .includes(connectedAddress);
  const canFile =
    isParty &&
    template?.appeal_enabled &&
    verdict?.appeal_allowed &&
    disputeCase.status === "verdict_issued" &&
    !appeal;

  async function onFileAppeal(e: React.FormEvent) {
    e.preventDefault();
    const urls = evidenceUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    await fileAppeal.write([caseIdNum, basis, statement, urls]);
    refetchAll();
  }

  async function onRequestReview() {
    await requestAppealReview.write([caseIdNum]);
    refetchAll();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href={`/cases/${caseIdNum}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to case room
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-appeal-purple">Appeal Dock</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Case #{caseIdNum}</h1>
        </div>
        <Badge variant="outline">{statusLabel(disputeCase.status)}</Badge>
      </div>

      <div className="mt-8">
        <AppealDock appeal={appeal} />
      </div>

      {appeal && appeal.status === "filed" && (
        <div className="mt-6 rounded-lg border border-appeal-purple/30 bg-appeal-purple/5 p-5 text-center">
          <p className="text-sm text-muted">
            The appeal has been filed. Trigger the non-deterministic appeal review to get a final,
            binding outcome.
          </p>
          <Button className="mt-3" onClick={onRequestReview} disabled={requestAppealReview.status === "pending"}>
            {requestAppealReview.status === "pending" ? "Validators are reviewing…" : "Request Appeal Review"}
          </Button>
          {requestAppealReview.error && <p className="mt-2 text-sm text-fault-red">{requestAppealReview.error}</p>}
        </div>
      )}

      {canFile && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-appeal-purple" /> File an appeal
            </CardTitle>
            <CardDescription>file_appeal(case_id, basis, statement, evidence_urls)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onFileAppeal} className="space-y-4">
              <div>
                <Label>Basis</Label>
                <Select value={basis} onValueChange={setBasis}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPEAL_BASES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="statement">Statement</Label>
                <Textarea id="statement" value={statement} onChange={(e) => setStatement(e.target.value)} required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="evidenceUrls">Additional evidence URLs (one per line)</Label>
                <Textarea id="evidenceUrls" value={evidenceUrls} onChange={(e) => setEvidenceUrls(e.target.value)} className="mt-1.5" placeholder="https://…" />
              </div>
              <Button type="submit" disabled={fileAppeal.status === "pending"}>
                {fileAppeal.status === "pending" ? "Filing…" : "File Appeal"}
              </Button>
              {fileAppeal.error && <p className="text-sm text-fault-red">{fileAppeal.error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {!canFile && !appeal && (
        <p className="mt-6 text-sm text-muted">
          {!template?.appeal_enabled
            ? "This template does not allow appeals."
            : disputeCase.status !== "verdict_issued"
              ? "An appeal can only be filed while a verdict is active and unappealed."
              : verdict && !verdict.appeal_allowed
                ? "This verdict does not permit an appeal."
                : "Only a case party can file an appeal."}
        </p>
      )}
    </div>
  );
}
