"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/lib/genlayer/wallet";
import { useContractRead } from "@/lib/genlayer/hooks";
import { statusLabel, shortAddress, weiToGen } from "@/lib/format";
import type { DisputeCase } from "@/lib/genlayer/types";

export default function ProfilePage() {
  const { status, address, balance, connect } = useWallet();
  const { data: cases, loading } = useContractRead<DisputeCase[]>(
    "get_cases_by_party",
    [address ?? ""],
    { enabled: !!address },
  );

  if (status !== "connected") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Wallet className="mx-auto h-8 w-8 text-judgement-cyan" />
        <h1 className="mt-4 font-display text-2xl font-bold">Party Dashboard</h1>
        <p className="mt-2 text-muted">Connect a StudioNet wallet to see your cases.</p>
        <Button className="mt-6" onClick={() => connect()}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  const connectedAddress = address?.toLowerCase();
  const asComplainant = (cases ?? []).filter(
    (c) => c.complainant.toLowerCase() === connectedAddress,
  );
  const asRespondent = (cases ?? []).filter(
    (c) => c.respondent.toLowerCase() === connectedAddress,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">Party Dashboard</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Your Cases</h1>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span className="font-mono">{shortAddress(address, 6)}</span>
        <span>·</span>
        <span>{balance !== null ? `${weiToGen(balance).toFixed(4)} GEN` : "-"} on StudioNet</span>
      </div>

      {loading ? (
        <div className="mt-8 space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <CaseGroup title="As Complainant" cases={asComplainant} />
          <CaseGroup title="As Respondent" cases={asRespondent} />
        </div>
      )}
    </div>
  );
}

function CaseGroup({ title, cases }: { title: string; cases: DisputeCase[] }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{title}</p>
      <div className="mt-3 space-y-2">
        {cases.length === 0 ? (
          <p className="text-sm text-muted">No cases yet.</p>
        ) : (
          cases.map((c) => (
            <Link
              key={c.case_id}
              href={`/cases/${c.case_id}`}
              className="flex items-center justify-between rounded-md border border-border bg-panel-ash/40 px-4 py-3 hover:border-judgement-cyan/50"
            >
              <div>
                <p className="font-display text-sm font-medium">Case #{c.case_id}</p>
                <p className="line-clamp-1 max-w-xs text-xs text-muted">{c.case_summary}</p>
              </div>
              <Badge variant="outline">{statusLabel(c.status)}</Badge>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
