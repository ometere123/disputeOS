import { Terminal } from "lucide-react";

const SNIPPET = `import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({ chain: studionet, account: createAccount() });

// Any app can open a case against a template it defines once.
const caseId = await client.writeContract({
  address: DISPUTEOS_ADDRESS,
  functionName: "open_case",
  args: [appId, templateId, respondent, caseSummary, requestedRemedy, evidenceDeadline],
  value: 0n,
});

// Later, read the canonical verdict directly from the contract.
const verdict = await client.readContract({
  address: DISPUTEOS_ADDRESS,
  functionName: "get_case_verdict",
  args: [caseId],
});`;

export function IntegrationSnippet({ title = "Integrating DisputeOS" }: { title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-strong bg-void-black">
      <div className="flex items-center gap-2 border-b border-border bg-panel-ash/60 px-4 py-2">
        <Terminal className="h-3.5 w-3.5 text-judgement-cyan" />
        <span className="font-mono text-xs text-muted">{title}</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground/90">
        <code>{SNIPPET}</code>
      </pre>
    </div>
  );
}
