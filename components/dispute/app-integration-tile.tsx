import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExplorerAddressLink } from "@/components/layout/explorer-link";
import type { RegisteredApp } from "@/lib/genlayer/types";

export function AppIntegrationTile({ app }: { app: RegisteredApp }) {
  return (
    <Card className="group relative h-full p-5 transition-colors hover:border-judgement-cyan/50">
      <Link href={`/apps/${app.app_id}`} className="absolute inset-0 z-0" aria-label={`Open ${app.name}`} />
      <div className="pointer-events-none relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-lg font-semibold group-hover:text-judgement-cyan">
              {app.name}
            </p>
            <p className="text-sm text-muted">{app.domain}</p>
          </div>
          <Badge variant={app.active ? "green" : "muted"}>
            {app.active ? "active" : "inactive"}
          </Badge>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-foreground/80">{app.description}</p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            App #{app.app_id}
          </span>
          <span className="pointer-events-auto relative z-20">
            <ExplorerAddressLink address={app.owner} label="owner" />
          </span>
        </div>
      </div>
    </Card>
  );
}
