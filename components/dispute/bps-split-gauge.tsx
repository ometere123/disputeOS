import { bpsToPercent } from "@/lib/format";

export function BpsSplitGauge({
  complainantBps,
  respondentBps,
}: {
  complainantBps: number;
  respondentBps: number;
}) {
  const complainantPct = complainantBps / 100;
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted">
        <span>Complainant {bpsToPercent(complainantBps)}</span>
        <span>Respondent {bpsToPercent(respondentBps)}</span>
      </div>
      <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full border border-border">
        <div
          className="h-full bg-judgement-cyan transition-all"
          style={{ width: `${complainantPct}%` }}
        />
        <div
          className="h-full bg-appeal-purple transition-all"
          style={{ width: `${100 - complainantPct}%` }}
        />
      </div>
    </div>
  );
}
