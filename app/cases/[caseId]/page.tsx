"use client";

import { use } from "react";
import Link from "next/link";
import { FileSearch, Gavel, ShieldAlert, Wallet2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DisputePacketCard } from "@/components/dispute/dispute-packet-card";
import { PartyPositionPanel } from "@/components/dispute/party-position-panel";
import { CaseTimeline, type TimelineStep } from "@/components/dispute/case-timeline";
import { VerdictKernel } from "@/components/dispute/verdict-kernel";
import { SettlementRail } from "@/components/dispute/settlement-rail";
import { useCaseBundle } from "@/lib/genlayer/use-case-bundle";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/genlayer/wallet";
import { statusLabel } from "@/lib/format";
import { genToWei } from "@/lib/format";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function CaseRoomPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const caseIdNum = Number(caseId);
  const { disputeCase, app, template, verdict, appeal, loading, error, refetchAll } =
    useCaseBundle(caseIdNum);
  const { address } = useWallet();
  const fundCase = useContractWrite("fund_case");
  const [fundAmount, setFundAmount] = useState("100");

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (error || !disputeCase || !app || !template) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-fault-red">{error ?? "Case not found."}</p>
      </div>
    );
  }

  const steps: TimelineStep[] = [
    { label: "Case opened", timestamp: disputeCase.created_at, done: true },
    {
      label: "Case funded",
      timestamp: null,
      done: ["evidence_open", "evidence_closed", "under_validator_review", "verdict_issued", "appeal_window_open", "appeal_under_review", "finalized", "settled"].includes(disputeCase.status),
      current: disputeCase.status === "case_opened",
    },
    {
      label: "Evidence window",
      timestamp: disputeCase.evidence_deadline,
      done: !["case_opened", "evidence_open"].includes(disputeCase.status),
      current: disputeCase.status === "evidence_open",
    },
    {
      label: "Validator review",
      timestamp: verdict?.issued_at ?? null,
      done: !!verdict,
      current: disputeCase.status === "evidence_closed" || disputeCase.status === "under_validator_review",
    },
    {
      label: "Verdict issued",
      timestamp: verdict?.issued_at ?? null,
      done: !!verdict,
      current: disputeCase.status === "verdict_issued",
    },
    {
      label: "Finalized & settled",
      timestamp: null,
      done: disputeCase.status === "settled",
      current: disputeCase.status === "finalized",
    },
  ];

  const connectedAddress = address?.toLowerCase();
  const isParty =
    !!connectedAddress &&
    [disputeCase.complainant, disputeCase.respondent]
      .map((party) => party.toLowerCase())
      .includes(connectedAddress);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">
            Case Room · {app.name}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Case #{disputeCase.case_id}</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          {statusLabel(disputeCase.status)}
        </Badge>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/cases/${caseIdNum}/evidence`}>
            <FileSearch className="h-4 w-4" /> Evidence Intake
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/cases/${caseIdNum}/verdict`}>
            <Gavel className="h-4 w-4" /> Verdict Chamber
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/cases/${caseIdNum}/appeal`}>
            <ShieldAlert className="h-4 w-4" /> Appeal Dock
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <DisputePacketCard appName={app.name} template={template} disputeCase={disputeCase} />
          <PartyPositionPanel
            complainant={disputeCase.complainant}
            respondent={disputeCase.respondent}
            respondentResponse={disputeCase.respondent_response}
          />

          {disputeCase.status === "case_opened" && isParty && (
            <div className="rounded-lg border border-dispute-amber/30 bg-dispute-amber/5 p-5">
              <div className="flex items-center gap-2 text-dispute-amber">
                <Wallet2 className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-widest">Fund this case</span>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await fundCase.write([caseIdNum], genToWei(fundAmount));
                  refetchAll();
                }}
                className="mt-3 flex gap-2"
              >
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                />
                <Button type="submit" variant="amber" disabled={fundCase.status === "signing" || fundCase.status === "pending"}>
                  {fundCase.status === "pending" ? "Confirming…" : "Fund"}
                </Button>
              </form>
              {fundCase.error && <p className="mt-2 text-sm text-fault-red">{fundCase.error}</p>}
            </div>
          )}

          {verdict && <VerdictKernel verdict={verdict} />}
        </div>

        <div className="space-y-8">
          <div className="rounded-lg border border-border bg-panel-ash/30 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Case Timeline</p>
            <div className="mt-4">
              <CaseTimeline steps={steps} />
            </div>
          </div>
          <SettlementRail disputeCase={disputeCase} verdict={verdict} />
          {appeal && (
            <div className="rounded-lg border border-appeal-purple/30 bg-appeal-purple/5 p-4 text-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-appeal-purple">
                Appeal on file
              </p>
              <p className="mt-1 text-muted">Status: {appeal.status}</p>
              <Link href={`/cases/${caseIdNum}/appeal`} className="mt-2 inline-block text-xs text-judgement-cyan hover:underline">
                View appeal dock →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
