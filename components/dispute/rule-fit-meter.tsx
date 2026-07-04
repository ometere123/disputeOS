import { RULE_FIT_ORDER, orderIndex } from "@/lib/genlayer/bands";
import type { RuleFit } from "@/lib/genlayer/types";

export function RuleFitMeter({ fit }: { fit: RuleFit }) {
  const idx = orderIndex(RULE_FIT_ORDER, fit);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Rule Fit</span>
        <span className="font-mono text-xs text-dispute-amber">{fit}</span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {RULE_FIT_ORDER.map((band, i) => (
          <div
            key={band}
            className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-dispute-amber" : "bg-panel-ash"}`}
          />
        ))}
      </div>
    </div>
  );
}
