"use client";

import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppIntegrationTile } from "@/components/dispute/app-integration-tile";
import { ReusableContractPanel } from "@/components/dispute/reusable-contract-panel";
import { useContractRead } from "@/lib/genlayer/hooks";
import { hasContractAddress } from "@/lib/genlayer/contract";
import type { RegisteredApp } from "@/lib/genlayer/types";

export default function AppsPage() {
  const deployed = hasContractAddress();
  const { data, loading, error } = useContractRead<RegisteredApp[]>("get_all_apps", [], {
    enabled: deployed,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">
            Integration Console
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Registered Apps</h1>
          <p className="mt-2 max-w-xl text-muted">
            Every app below registered itself once against DisputeOSProtocol and now opens cases
            against its own dispute templates.
          </p>
        </div>
        <Button asChild>
          <Link href="/apps/register">
            <Plus className="h-4 w-4" /> Register App
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <ReusableContractPanel compact />
      </div>

      <div className="mt-8">
        {!deployed ? (
          <NotDeployedNotice />
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : error ? (
          <ErrorNotice message={error} />
        ) : !data || data.length === 0 ? (
          <EmptyNotice />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((app) => (
              <AppIntegrationTile key={app.app_id} app={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotDeployedNotice() {
  return (
    <div className="rounded-lg border border-dispute-amber/30 bg-dispute-amber/5 p-6 text-sm">
      <div className="flex items-center gap-2 text-dispute-amber">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-mono text-xs uppercase tracking-widest">Contract not configured</span>
      </div>
      <p className="mt-2 text-muted">
        Set <code className="font-mono">NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS</code> in{" "}
        <code className="font-mono">.env.local</code> after deploying DisputeOSProtocol to
        StudioNet. Nothing on this console reads from anywhere except the chain.
      </p>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-fault-red/30 bg-fault-red/5 p-6 text-sm text-fault-red">
      {message}
    </div>
  );
}

function EmptyNotice() {
  return (
    <div className="rounded-lg border border-dashed border-border-strong p-10 text-center text-sm text-muted">
      No apps registered yet. Be the first integration.
    </div>
  );
}
