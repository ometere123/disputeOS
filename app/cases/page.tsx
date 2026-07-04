"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractRead } from "@/lib/genlayer/hooks";
import { hasContractAddress } from "@/lib/genlayer/contract";
import { statusLabel, shortAddress, timeUntil } from "@/lib/format";
import type { DisputeCase } from "@/lib/genlayer/types";

const STATUS_TONE: Record<string, "green" | "red" | "amber" | "purple" | "muted" | "default"> = {
  case_opened: "muted",
  evidence_open: "default",
  evidence_closed: "amber",
  under_validator_review: "purple",
  verdict_issued: "amber",
  appeal_window_open: "purple",
  appeal_under_review: "purple",
  finalized: "green",
  settled: "green",
  cancelled: "red",
  expired: "red",
  insufficient_evidence: "red",
  manual_review_required: "purple",
  unverifiable: "red",
  settlement_failed: "red",
};

export default function CaseBoardPage() {
  const deployed = hasContractAddress();
  const { data, loading, error } = useContractRead<DisputeCase[]>("get_all_cases", [], {
    enabled: deployed,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">Case Board</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Cases</h1>
          <p className="mt-2 max-w-xl text-muted">
            Every case here is real on-chain state from DisputeOSProtocol: evidence, verdicts,
            and settlement are all read directly from the contract.
          </p>
        </div>
        <Button asChild>
          <Link href="/cases/open">
            <Plus className="h-4 w-4" /> Open Case
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        {!deployed ? (
          <div className="rounded-lg border border-dispute-amber/30 bg-dispute-amber/5 p-6 text-sm text-muted">
            Contract address not configured yet. Deploy DisputeOSProtocol and set{" "}
            <code className="font-mono">NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS</code>.
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-fault-red">{error}</p>
        ) : !data || data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong p-10 text-center text-sm text-muted">
            No cases opened yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-panel-ash/60 text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-4 py-3">Case</th>
                  <th className="px-4 py-3">Parties</th>
                  <th className="px-4 py-3">Settlement</th>
                  <th className="px-4 py-3">Evidence deadline</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .slice()
                  .sort((a, b) => b.case_id - a.case_id)
                  .map((c) => (
                    <tr key={c.case_id} className="border-t border-border hover:bg-panel-ash/40">
                      <td className="px-4 py-3">
                        <Link href={`/cases/${c.case_id}`} className="font-display font-medium text-foreground hover:text-judgement-cyan">
                          #{c.case_id}
                        </Link>
                        <p className="line-clamp-1 max-w-xs text-xs text-muted">{c.case_summary}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {shortAddress(c.complainant)} vs {shortAddress(c.respondent)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-dispute-amber">
                        {c.settlement_amount} GEN
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {timeUntil(c.evidence_deadline)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_TONE[c.status] ?? "outline"}>{statusLabel(c.status)}</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
