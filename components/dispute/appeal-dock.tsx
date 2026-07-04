import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/format";
import type { Appeal } from "@/lib/genlayer/types";

const STATUS_TONE: Record<string, "amber" | "purple" | "green"> = {
  filed: "amber",
  under_review: "purple",
  resolved: "green",
};

export function AppealDock({ appeal }: { appeal: Appeal | null }) {
  if (!appeal) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-5 text-center text-sm text-muted">
        <ShieldAlert className="mx-auto mb-2 h-5 w-5 text-appeal-purple" />
        No appeal has been filed for this case.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-appeal-purple/30 bg-appeal-purple/5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-appeal-purple">
          <ShieldAlert className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Appeal Dock</span>
        </div>
        <Badge variant={STATUS_TONE[appeal.status] ?? "purple"}>{appeal.status}</Badge>
      </div>
      <p className="mt-3 font-display text-sm font-semibold">Basis: {appeal.basis.replaceAll("_", " ")}</p>
      <p className="mt-2 text-sm text-foreground/85">{appeal.statement}</p>
      {appeal.evidence_urls.length > 0 && (
        <ul className="mt-3 space-y-1">
          {appeal.evidence_urls.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer" className="font-mono text-xs text-judgement-cyan hover:underline">
                {url}
              </a>
            </li>
          ))}
        </ul>
      )}
      {appeal.result && (
        <p className="mt-3 rounded-md bg-void-black/40 p-2 font-mono text-xs text-appeal-purple">
          result: {appeal.result}
        </p>
      )}
      <p className="mt-3 font-mono text-[10px] text-muted">Filed {formatTimestamp(appeal.created_at)}</p>
    </div>
  );
}
