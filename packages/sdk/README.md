# DisputeOS SDK

TypeScript SDK for the DisputeOS reusable GenLayer Intelligent Contract.

## Quick Start

```ts
import { DisputeOS } from "@/packages/sdk/src";

const sdk = new DisputeOS({
  contractAddress: "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE",
  rpcUrl: "https://studio.genlayer.com/api",
  account: myAccount, // genlayer-js account (optional for reads)
});

// Read all registered apps
const apps = await sdk.getAllApps();

// Open a dispute case
const { txHash, receipt } = await sdk.openCase({
  appId: 1,
  templateId: 1,
  respondent: "0x...",
  caseSummary: "Item not as described",
  requestedRemedy: "Full refund",
  evidenceDeadline: Math.floor(Date.now() / 1000) + 86400 * 7,
});

// Fund a case with 50 GEN
await sdk.fundCase({ caseId: 1, amountGEN: 50 });
```

## Helpers

```ts
import { formatGEN, parseGEN, statusLabel, canAppeal } from "@/packages/sdk/src";

formatGEN(parseGEN(100));     // "100 GEN"
statusLabel("evidence_open"); // "Evidence Open"
```

## Method Reference

### Write Methods

| Method | Parameters |
|---|---|
| `registerApp` | `name, domain, description` |
| `createTemplate` | `appId, name, caseType, rules, requiredEvidence, allowedVerdicts, settlementMode, appealEnabled, appealWindow, publicVisibility` |
| `openCase` | `appId, templateId, respondent, caseSummary, requestedRemedy, evidenceDeadline` |
| `fundCase` | `caseId, amountGEN` |
| `respondToCase` | `caseId, response` |
| `submitEvidence` | `caseId, evidenceType, title, statement, publicUrl` |
| `closeEvidence` | `caseId` |
| `requestVerdict` | `caseId` |
| `fileAppeal` | `caseId, basis, statement, evidenceUrls` |
| `requestAppealReview` | `caseId, appealId` |
| `finalizeCase` | `caseId` |
| `claimSettlement` | `caseId` |

### Read Methods

| Method | Returns |
|---|---|
| `getAllApps()` | `RegisteredApp[]` |
| `getApp(appId)` | `RegisteredApp` |
| `getAppTemplates(appId)` | `DisputeTemplate[]` |
| `getTemplate(templateId)` | `DisputeTemplate` |
| `getAllCases()` | `DisputeCase[]` |
| `getCase(caseId)` | `DisputeCase` |
| `getCasesByApp(appId)` | `DisputeCase[]` |
| `getCasesByParty(address)` | `DisputeCase[]` |
| `getCaseEvidence(caseId)` | `EvidenceItem[]` |
| `getCaseVerdict(caseId)` | `Verdict \| null` |
| `getCaseAppeals(caseId)` | `Appeal[]` |
