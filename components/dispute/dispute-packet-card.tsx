import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { shortAddress } from "@/lib/format";
import type { DisputeCase, DisputeTemplate } from "@/lib/genlayer/types";

export function DisputePacketCard({
  appName,
  template,
  disputeCase,
}: {
  appName: string;
  template: Pick<DisputeTemplate, "name" | "case_type" | "settlement_mode" | "allowed_verdicts">;
  disputeCase: Pick<
    DisputeCase,
    "case_id" | "complainant" | "respondent" | "case_summary" | "requested_remedy" | "settlement_amount"
  >;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Dispute Packet</p>
          <CardTitle>{appName}</CardTitle>
        </div>
        <Badge variant="outline" className="font-mono">
          case #{disputeCase.case_id}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Template</p>
            <p className="mt-1">{template.name}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Case type</p>
            <p className="mt-1 font-mono">{template.case_type}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Complainant</p>
            <p className="mt-1 font-mono">{shortAddress(disputeCase.complainant)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Respondent</p>
            <p className="mt-1 font-mono">{shortAddress(disputeCase.respondent)}</p>
          </div>
        </div>
        <Separator />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Case summary</p>
          <p className="mt-1 leading-relaxed text-foreground/90">{disputeCase.case_summary}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Requested remedy</p>
          <p className="mt-1">{disputeCase.requested_remedy}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-panel-ash/50 px-3 py-2">
          <span className="font-mono text-xs text-muted">Settlement mode</span>
          <Badge variant="amber">{template.settlement_mode}</Badge>
          <span className="font-mono text-xs text-muted">Amount</span>
          <span className="font-mono text-sm text-dispute-amber">{disputeCase.settlement_amount} GEN</span>
        </div>
      </CardContent>
    </Card>
  );
}
