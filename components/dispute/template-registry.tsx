import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DisputeTemplate } from "@/lib/genlayer/types";

export function TemplateRegistry({
  appId,
  templates,
}: {
  appId: number;
  templates: DisputeTemplate[];
}) {
  return (
    <div className="rounded-lg border border-border bg-panel-ash/30 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <Layers className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Contract Module Registry
          </span>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/apps/${appId}/templates/create`}>
            <Plus className="h-3.5 w-3.5" /> New template
          </Link>
        </Button>
      </div>
      {templates.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No dispute templates yet. Create one to define rules, allowed verdicts, and settlement
          mode, then open cases against it.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {templates.map((t) => (
            <div
              key={t.template_id}
              className="flex items-center justify-between rounded-md border border-border bg-void-black/40 px-3 py-2.5"
            >
              <div>
                <p className="font-display text-sm font-medium">{t.name}</p>
                <p className="font-mono text-xs text-muted">{t.case_type}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t.settlement_mode}</Badge>
                {t.appeal_enabled && <Badge variant="purple">appeals</Badge>}
                <Badge variant="muted">#{t.template_id}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
