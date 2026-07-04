import { formatTimestamp } from "@/lib/format";

export interface TimelineStep {
  label: string;
  timestamp: number | null;
  done: boolean;
  current?: boolean;
}

export function CaseTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={`absolute left-[7px] top-4 h-full w-px ${
                step.done ? "bg-judgement-cyan/50" : "bg-border"
              }`}
            />
          )}
          <span
            className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
              step.current
                ? "border-judgement-cyan bg-judgement-cyan/30 animate-pulse-glow"
                : step.done
                  ? "border-judgement-cyan bg-judgement-cyan"
                  : "border-border-strong bg-void-black"
            }`}
          />
          <div>
            <p className={`font-display text-sm ${step.done ? "text-foreground" : "text-muted"}`}>
              {step.label}
            </p>
            {step.timestamp && (
              <p className="font-mono text-[10px] text-muted">{formatTimestamp(step.timestamp)}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
