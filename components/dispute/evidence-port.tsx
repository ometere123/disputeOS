import { FileText, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/format";
import type { EvidenceItem } from "@/lib/genlayer/types";

export function EvidencePort({
  evidence,
  role,
}: {
  evidence: EvidenceItem;
  role: "complainant" | "respondent";
}) {
  return (
    <div className="flex gap-3 rounded-md border border-border bg-panel-ash/40 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-strong bg-void-black/60">
        <FileText className="h-4 w-4 text-judgement-cyan" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-display text-sm font-medium">{evidence.title}</p>
          <Badge variant={role === "complainant" ? "default" : "amber"} className="shrink-0">
            {role}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted">{evidence.evidence_type}</p>
        <p className="mt-2 text-sm text-foreground/85">{evidence.statement}</p>
        <a
          href={evidence.public_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-judgement-cyan hover:underline"
        >
          <LinkIcon className="h-3 w-3" />
          {evidence.public_url}
        </a>
        <p className="mt-1 font-mono text-[10px] text-muted">{formatTimestamp(evidence.submitted_at)}</p>
      </div>
    </div>
  );
}
