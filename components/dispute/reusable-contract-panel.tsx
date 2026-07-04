import { Boxes } from "lucide-react";

export function ReusableContractPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-judgement-cyan/30 bg-gradient-to-br from-judgement-cyan/10 via-transparent to-appeal-purple/10 ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <div className="flex items-center gap-2 text-judgement-cyan">
        <Boxes className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Reference Console Notice</span>
      </div>
      <p className={`mt-2 font-display font-semibold ${compact ? "text-sm" : "text-lg"}`}>
        This dashboard is only a reference console.
      </p>
      <p className="mt-1 text-sm text-muted">
        The product is <span className="text-foreground">DisputeOSProtocol</span>, the reusable
        Intelligent Contract underneath. Any app can register, define a template, and open cases
        against it. This UI just demonstrates one possible integration.
      </p>
    </div>
  );
}
