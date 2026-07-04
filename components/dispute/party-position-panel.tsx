import { User } from "lucide-react";
import { shortAddress } from "@/lib/format";
import { ExplorerAddressLink } from "@/components/layout/explorer-link";

export function PartyPositionPanel({
  complainant,
  respondent,
  respondentResponse,
}: {
  complainant: string;
  respondent: string;
  respondentResponse: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-judgement-cyan/30 bg-judgement-cyan/5 p-4">
        <div className="flex items-center gap-2 text-judgement-cyan">
          <User className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Complainant</span>
        </div>
        <p className="mt-2 font-mono text-sm">{shortAddress(complainant, 6)}</p>
        <ExplorerAddressLink address={complainant} label="view on explorer" />
      </div>
      <div className="rounded-lg border border-dispute-amber/30 bg-dispute-amber/5 p-4">
        <div className="flex items-center gap-2 text-dispute-amber">
          <User className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Respondent</span>
        </div>
        <p className="mt-2 font-mono text-sm">{shortAddress(respondent, 6)}</p>
        <ExplorerAddressLink address={respondent} label="view on explorer" />
        {respondentResponse && (
          <p className="mt-3 rounded-md bg-void-black/40 p-2 text-xs text-foreground/85">
            &ldquo;{respondentResponse}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
