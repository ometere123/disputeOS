import { EVIDENCE_ALIGNMENT_ORDER, orderIndex } from "@/lib/genlayer/bands";
import type { EvidenceAlignment } from "@/lib/genlayer/types";

export function EvidenceAlignmentBar({ alignment }: { alignment: EvidenceAlignment }) {
  const idx = orderIndex(EVIDENCE_ALIGNMENT_ORDER, alignment);
  const pct = (idx / (EVIDENCE_ALIGNMENT_ORDER.length - 1)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Evidence Alignment
        </span>
        <span className="font-mono text-xs text-judgement-cyan">{alignment}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-panel-ash">
        <div
          className="h-full rounded-full bg-judgement-cyan transition-all"
          style={{ width: `${Math.max(pct, 6)}%` }}
        />
      </div>
    </div>
  );
}
