"use client";

import { use } from "react";
import Link from "next/link";
import { Plus, Gavel } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateRegistry } from "@/components/dispute/template-registry";
import { RoleManager } from "@/components/dispute/role-manager";
import { ExplorerAddressLink } from "@/components/layout/explorer-link";
import { useContractRead } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/genlayer/wallet";
import { statusLabel } from "@/lib/format";
import type { DisputeCase, DisputeTemplate, RegisteredApp } from "@/lib/genlayer/types";

export default function AppCommandCenterPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const appIdNum = Number(appId);

  const { data: app, loading, error } = useContractRead<RegisteredApp>("get_app", [appIdNum]);
  const { data: templates } = useContractRead<DisputeTemplate[]>("get_app_templates", [appIdNum]);
  const { data: cases } = useContractRead<DisputeCase[]>("get_cases_by_app", [appIdNum]);
  const { address } = useWallet();
  const isAppOwner = !!address && !!app && address.toLowerCase() === app.owner.toLowerCase();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-fault-red">{error ?? "App not found."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">
        App Command Center · App #{app.app_id}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{app.name}</h1>
          <p className="mt-1 text-muted">{app.domain}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={app.active ? "green" : "muted"}>{app.active ? "active" : "inactive"}</Badge>
          <Button asChild size="sm">
            <Link href="/cases/open">
              <Plus className="h-4 w-4" /> Open Case
            </Link>
          </Button>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm text-foreground/85">{app.description}</p>
      <p className="mt-2">
        Owner: <ExplorerAddressLink address={app.owner} />
      </p>

      <div className="mt-10">
        <TemplateRegistry appId={app.app_id} templates={templates ?? []} />
      </div>

      {isAppOwner && (
        <div className="mt-10">
          <RoleManager appId={app.app_id} />
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center gap-2 text-muted">
          <Gavel className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Cases against this app</span>
        </div>
        {!cases || cases.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No cases opened yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {cases.map((c) => (
              <Link
                key={c.case_id}
                href={`/cases/${c.case_id}`}
                className="flex items-center justify-between rounded-md border border-border bg-panel-ash/40 px-4 py-3 hover:border-judgement-cyan/50"
              >
                <div>
                  <p className="font-display text-sm font-medium">Case #{c.case_id}</p>
                  <p className="line-clamp-1 text-xs text-muted">{c.case_summary}</p>
                </div>
                <Badge variant="outline">{statusLabel(c.status)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
