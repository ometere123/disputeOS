"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from "@/lib/genlayer/wallet";
import { useContractRead, useContractWrite } from "@/lib/genlayer/hooks";
import { getReadOnlyClient, requireContractAddress } from "@/lib/genlayer/contract";
import { ExplorerTxLink } from "@/components/layout/explorer-link";
import { genToWei } from "@/lib/format";
import type { DisputeCase, DisputeTemplate, RegisteredApp } from "@/lib/genlayer/types";

function defaultDeadline() {
  const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export default function OpenCasePage() {
  const { status, connect, address } = useWallet();
  const { data: apps } = useContractRead<RegisteredApp[]>("get_all_apps", []);

  const [appId, setAppId] = useState<string>("");
  const { data: templates } = useContractRead<DisputeTemplate[]>(
    "get_app_templates",
    [Number(appId) || 0],
    { enabled: !!appId },
  );
  const [templateId, setTemplateId] = useState<string>("");
  const [respondent, setRespondent] = useState("");
  const [caseSummary, setCaseSummary] = useState(
    "Client says the builder failed to deliver the agreed landing page. Builder says they completed the page and submitted the link before the deadline.",
  );
  const [requestedRemedy, setRequestedRemedy] = useState("refund_70_percent");
  const [evidenceDeadline, setEvidenceDeadline] = useState(defaultDeadline());
  const [fundAmount, setFundAmount] = useState("100");

  const openCase = useContractWrite("open_case");
  const fundCase = useContractWrite("fund_case");
  const [newCaseId, setNewCaseId] = useState<number | null>(null);
  const [submittedCase, setSubmittedCase] = useState<{
    appId: number;
    templateId: number;
    respondent: string;
    caseSummary: string;
    requestedRemedy: string;
    evidenceDeadline: number;
  } | null>(null);
  const [submittedFundCaseId, setSubmittedFundCaseId] = useState<number | null>(null);
  const fundCaseStatus = fundCase.status;
  const resetFundCase = fundCase.reset;

  async function onOpenCase(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "connected") {
      await connect();
      return;
    }
    const deadlineUnix = Math.floor(new Date(evidenceDeadline).getTime() / 1000);
    const caseSnapshot = {
      appId: Number(appId),
      templateId: Number(templateId),
      respondent,
      caseSummary,
      requestedRemedy,
      evidenceDeadline: deadlineUnix,
    };
    setSubmittedCase(caseSnapshot);
    await openCase.write([
      caseSnapshot.appId,
      caseSnapshot.templateId,
      caseSnapshot.respondent,
      caseSnapshot.caseSummary,
      caseSnapshot.requestedRemedy,
      caseSnapshot.evidenceDeadline,
    ]);
    // The write receipt doesn't decode the returned case_id in a stable
    // shape, so we resolve it the same way the rest of the console reads
    // state: straight from the contract. The new case is simply the
    // highest case_id now associated with this wallet.
    if (address) {
      const client = getReadOnlyClient();
      const contractAddress = requireContractAddress();
      const myCases = (await client.readContract({
        address: contractAddress,
        functionName: "get_cases_by_party",
        args: [address],
      })) as unknown as DisputeCase[];
      if (myCases.length > 0) {
        const latest = myCases.reduce((max, c) => (c.case_id > max.case_id ? c : max));
        setNewCaseId(latest.case_id);
      }
    }
  }

  async function onFund(e: React.FormEvent) {
    e.preventDefault();
    if (!newCaseId) return;
    setSubmittedFundCaseId(newCaseId);
    await fundCase.write([newCaseId], genToWei(fundAmount));
  }

  useEffect(() => {
    if (!submittedCase || !address || newCaseId || !["signing", "pending"].includes(openCase.status)) return;
    let cancelled = false;
    const expected = submittedCase;
    const walletAddress = address;
    const ownerAddress = address.toLowerCase();
    const respondentAddress = expected.respondent.toLowerCase();

    async function recoverOpenedCase() {
      try {
        const client = getReadOnlyClient();
        const contractAddress = requireContractAddress();
        const myCases = (await client.readContract({
          address: contractAddress,
          functionName: "get_cases_by_party",
          args: [walletAddress],
        })) as unknown as DisputeCase[];
        const match = myCases
          .filter(
            (c) =>
              c.complainant.toLowerCase() === ownerAddress &&
              c.respondent.toLowerCase() === respondentAddress &&
              c.app_id === expected.appId &&
              c.template_id === expected.templateId &&
              c.case_summary === expected.caseSummary &&
              c.requested_remedy === expected.requestedRemedy &&
              c.evidence_deadline === expected.evidenceDeadline,
          )
          .sort((a, b) => b.case_id - a.case_id)[0];
        if (!cancelled && match) {
          setNewCaseId(match.case_id);
        }
      } catch {
        // The transaction may still be indexing/finalizing; keep polling.
      }
    }

    recoverOpenedCase();
    const interval = setInterval(recoverOpenedCase, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, newCaseId, openCase.status, submittedCase]);

  useEffect(() => {
    if (!address || newCaseId || submittedCase) return;
    let cancelled = false;
    const walletAddress = address;
    const ownerAddress = address.toLowerCase();

    async function recoverLatestUnfundedCase() {
      try {
        const client = getReadOnlyClient();
        const contractAddress = requireContractAddress();
        const myCases = (await client.readContract({
          address: contractAddress,
          functionName: "get_cases_by_party",
          args: [walletAddress],
        })) as unknown as DisputeCase[];
        const latestOpen = myCases
          .filter((c) => c.complainant.toLowerCase() === ownerAddress && c.status === "case_opened")
          .sort((a, b) => b.case_id - a.case_id)[0];
        if (!cancelled && latestOpen) {
          setNewCaseId(latestOpen.case_id);
        }
      } catch {
        // The case board can still be used if this convenience lookup fails.
      }
    }

    recoverLatestUnfundedCase();
    return () => {
      cancelled = true;
    };
  }, [address, newCaseId, submittedCase]);

  useEffect(() => {
    if (!submittedFundCaseId || !["signing", "pending"].includes(fundCaseStatus)) return;
    let cancelled = false;

    async function recoverFundedCase() {
      try {
        const client = getReadOnlyClient();
        const contractAddress = requireContractAddress();
        const disputeCase = (await client.readContract({
          address: contractAddress,
          functionName: "get_case",
          args: [submittedFundCaseId],
        })) as unknown as DisputeCase;
        if (!cancelled && disputeCase.status === "evidence_open") {
          resetFundCase();
        }
      } catch {
        // The transaction may still be indexing/finalizing; keep polling.
      }
    }

    recoverFundedCase();
    const interval = setInterval(recoverFundedCase, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fundCaseStatus, resetFundCase, submittedFundCaseId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">
        Case Methods · open_case → fund_case
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Open Case</h1>
      <p className="mt-2 text-muted">
        Every case is a Dispute Packet against an existing app template. Fund it with GEN to open
        the evidence window.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>1. Case details</CardTitle>
          <CardDescription>open_case(app_id, template_id, respondent, case_summary, requested_remedy, evidence_deadline)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onOpenCase} className="space-y-5">
            <div>
              <Label>App</Label>
              <Select value={appId} onValueChange={(v) => { setAppId(v); setTemplateId(""); }}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select an app" />
                </SelectTrigger>
                <SelectContent>
                  {(apps ?? []).map((a) => (
                    <SelectItem key={a.app_id} value={String(a.app_id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!apps || apps.length === 0) && (
                <p className="mt-1.5 text-xs text-muted">
                  No apps yet. <Link href="/apps/register" className="text-judgement-cyan hover:underline">Register one</Link>.
                </p>
              )}
            </div>
            <div>
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId} disabled={!appId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {(templates ?? []).map((t) => (
                    <SelectItem key={t.template_id} value={String(t.template_id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {appId && (!templates || templates.length === 0) && (
                <p className="mt-1.5 text-xs text-muted">
                  This app has no templates yet.{" "}
                  <Link href={`/apps/${appId}/templates/create`} className="text-judgement-cyan hover:underline">
                    create one
                  </Link>
                  .
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="respondent">Respondent address</Label>
              <Input id="respondent" value={respondent} onChange={(e) => setRespondent(e.target.value)} placeholder="0x…" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="caseSummary">Case summary (30-3000 chars)</Label>
              <Textarea id="caseSummary" value={caseSummary} onChange={(e) => setCaseSummary(e.target.value)} required minLength={30} className="mt-1.5 min-h-[100px]" />
            </div>
            <div>
              <Label htmlFor="requestedRemedy">Requested remedy</Label>
              <Input id="requestedRemedy" value={requestedRemedy} onChange={(e) => setRequestedRemedy(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="evidenceDeadline">Evidence deadline</Label>
              <Input id="evidenceDeadline" type="datetime-local" value={evidenceDeadline} onChange={(e) => setEvidenceDeadline(e.target.value)} required className="mt-1.5" />
            </div>

            <Button type="submit" disabled={!appId || !templateId || openCase.status === "signing" || openCase.status === "pending"} className="w-full">
              {status !== "connected"
                ? "Connect Wallet to Continue"
                : openCase.status === "signing"
                  ? "Waiting for signature…"
                  : openCase.status === "pending"
                    ? "Confirming on StudioNet…"
                    : "Open Case"}
            </Button>
            {openCase.error && <p className="text-sm text-fault-red">{openCase.error}</p>}
            {openCase.txHash && (
              <p className="text-sm text-muted">
                Transaction: <ExplorerTxLink hash={openCase.txHash} />
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {newCaseId && (
        <Card className="mt-6 border-dispute-amber/30">
          <CardHeader>
            <CardTitle>2. Fund the case</CardTitle>
            <CardDescription>fund_case(case_id): payable, escrows GEN and opens the evidence window.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onFund} className="space-y-5">
              <div>
                <Label htmlFor="fundAmount">Amount (GEN)</Label>
                <Input
                  id="fundAmount"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" variant="amber" disabled={!newCaseId || fundCase.status === "signing" || fundCase.status === "pending"} className="w-full">
                {fundCase.status === "signing"
                  ? "Waiting for signature…"
                  : fundCase.status === "pending"
                    ? "Confirming on StudioNet…"
                    : "Fund Case"}
              </Button>
              {fundCase.error && <p className="text-sm text-fault-red">{fundCase.error}</p>}
              {(fundCase.status === "accepted" || fundCase.status === "idle") && newCaseId && submittedFundCaseId === newCaseId && (
                <p className="text-sm text-settlement-green">
                  Funded. <Link href={`/cases/${newCaseId}`} className="underline">Go to the case room →</Link>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {!address && (
        <p className="mt-6 text-center text-xs text-muted">
          Connect a StudioNet wallet from the top bar before opening a case.
        </p>
      )}
    </div>
  );
}
