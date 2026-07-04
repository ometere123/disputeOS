"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/genlayer/wallet";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { getReadOnlyClient, requireContractAddress } from "@/lib/genlayer/contract";
import { ExplorerTxLink } from "@/components/layout/explorer-link";
import { ALLOWED_VERDICTS, SETTLEMENT_MODES, type DisputeTemplate } from "@/lib/genlayer/types";

export default function CreateTemplatePage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const appIdNum = Number(appId);
  const { status, connect } = useWallet();
  const router = useRouter();
  const { write, status: writeStatus, txHash, error } = useContractWrite("create_template");

  const [name, setName] = useState("Freelance Delivery Dispute");
  const [caseType, setCaseType] = useState("freelance_delivery");
  const [rules, setRules] = useState(
    "The builder must deliver a responsive landing page, working contact form, GitHub source code, and deployment link before the deadline.",
  );
  const [requiredEvidence, setRequiredEvidence] = useState(
    "Scope agreement, delivery links (GitHub + deployed URL), and any communication about the deadline.",
  );
  const [allowedVerdicts, setAllowedVerdicts] = useState<string[]>([
    "complainant_wins",
    "respondent_wins",
    "split_settlement",
    "insufficient_evidence",
    "manual_review_required",
  ]);
  const [settlementMode, setSettlementMode] = useState("escrow_release");
  const [appealEnabled, setAppealEnabled] = useState(true);
  const [appealWindow, setAppealWindow] = useState(86400);
  const [publicVisibility, setPublicVisibility] = useState(true);
  const [submittedTemplate, setSubmittedTemplate] = useState<{
    name: string;
    caseType: string;
    rules: string;
    requiredEvidence: string;
    allowedVerdicts: string[];
    settlementMode: string;
    appealEnabled: boolean;
    appealWindow: number;
    publicVisibility: boolean;
  } | null>(null);

  function toggleVerdict(v: string) {
    setAllowedVerdicts((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "connected") {
      await connect();
      return;
    }
    const templateSnapshot = {
      name,
      caseType,
      rules,
      requiredEvidence,
      allowedVerdicts,
      settlementMode,
      appealEnabled,
      appealWindow,
      publicVisibility,
    };
    setSubmittedTemplate(templateSnapshot);
    const receipt = await write([
      appIdNum,
      templateSnapshot.name,
      templateSnapshot.caseType,
      templateSnapshot.rules,
      templateSnapshot.requiredEvidence,
      templateSnapshot.allowedVerdicts,
      templateSnapshot.settlementMode,
      templateSnapshot.appealEnabled,
      templateSnapshot.appealWindow,
      templateSnapshot.publicVisibility,
    ]);
    if (receipt) {
      setTimeout(() => router.push(`/apps/${appIdNum}`), 1200);
    }
  }

  useEffect(() => {
    if (!submittedTemplate || !["signing", "pending"].includes(writeStatus)) return;
    let cancelled = false;
    const expected = submittedTemplate;

    async function recoverAcceptedTemplate() {
      try {
        const client = getReadOnlyClient();
        const contractAddress = requireContractAddress();
        const templates = (await client.readContract({
          address: contractAddress,
          functionName: "get_app_templates",
          args: [appIdNum],
        })) as unknown as DisputeTemplate[];
        const match = templates.find(
          (template) =>
            template.name === expected.name &&
            template.case_type === expected.caseType &&
            template.rules === expected.rules &&
            template.required_evidence === expected.requiredEvidence &&
            template.settlement_mode === expected.settlementMode &&
            template.appeal_enabled === expected.appealEnabled &&
            template.appeal_window === expected.appealWindow &&
            template.public_visibility === expected.publicVisibility,
        );
        if (!cancelled && match) {
          router.push(`/apps/${appIdNum}`);
        }
      } catch {
        // The transaction may still be indexing/finalizing; keep polling.
      }
    }

    recoverAcceptedTemplate();
    const interval = setInterval(recoverAcceptedTemplate, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [appIdNum, router, submittedTemplate, writeStatus]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">
        App &amp; Template Methods · create_template
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Create Dispute Template</h1>
      <p className="mt-2 text-muted">
        A template defines the rules validators apply, the outcomes they&apos;re allowed to
        return, and how settlement works for every case opened against it.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Template definition</CardTitle>
          <CardDescription>For app #{appIdNum}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="caseType">Case type</Label>
              <Input id="caseType" value={caseType} onChange={(e) => setCaseType(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="rules">Rules (30-3000 chars)</Label>
              <Textarea id="rules" value={rules} onChange={(e) => setRules(e.target.value)} required minLength={30} maxLength={3000} className="mt-1.5 min-h-[100px]" />
            </div>
            <div>
              <Label htmlFor="requiredEvidence">Required evidence</Label>
              <Textarea id="requiredEvidence" value={requiredEvidence} onChange={(e) => setRequiredEvidence(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Allowed verdicts</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALLOWED_VERDICTS.map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => toggleVerdict(v)}
                    className="cursor-pointer"
                  >
                    <Badge variant={allowedVerdicts.includes(v) ? "default" : "muted"}>{v}</Badge>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="settlementMode">Settlement mode</Label>
              <Select value={settlementMode} onValueChange={setSettlementMode}>
                <SelectTrigger id="settlementMode" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETTLEMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appealWindow">Appeal window (seconds)</Label>
                <Input
                  id="appealWindow"
                  type="number"
                  value={appealWindow}
                  onChange={(e) => setAppealWindow(Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={appealEnabled} onChange={(e) => setAppealEnabled(e.target.checked)} />
                  Appeals enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={publicVisibility} onChange={(e) => setPublicVisibility(e.target.checked)} />
                  Public
                </label>
              </div>
            </div>

            <Button type="submit" disabled={writeStatus === "signing" || writeStatus === "pending"} className="w-full">
              {status !== "connected"
                ? "Connect Wallet to Continue"
                : writeStatus === "signing"
                  ? "Waiting for signature…"
                  : writeStatus === "pending"
                    ? "Confirming on StudioNet…"
                    : "Create Template"}
            </Button>
            {error && <p className="text-sm text-fault-red">{error}</p>}
            {txHash && (
              <p className="text-sm text-muted">
                Transaction: <ExplorerTxLink hash={txHash} />
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
