# DisputeOS Future Implementations

This document is for deciding what DisputeOS becomes after the current MVP.

The current product is:

1. `DisputeOSProtocol`, a reusable GenLayer Intelligent Contract.
2. A Next.js reference console that proves how apps can register, create templates, open cases, submit evidence, request verdicts, appeal, and settle.

**Current deployed contract (StudioNet):**

```
0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE
```

This deployment includes the validator JSON fallback fix, manual review resolver, app roles, and protocol fee support. It was redeployed with the project owner's key so that wallet is the protocol admin.

---

## Ways Teams Can Use DisputeOS

There are six integration modes, from lowest-level protocol access to embeddable widgets — all six are shipped and available today. Manual review resolution, app roles, and protocol fees are also live in the current contract deployment. Hosted/managed DisputeOS is a real future direction but is explicitly out of scope right now — see "Not In Current Scope" near the end of this document.

### Available Today

#### 1. Direct Contract Integration

Teams call the `DisputeOSProtocol` contract directly from their own app using `genlayer-js` or raw RPC. This is the lowest-level reusable protocol path.

Contract methods:

| Write methods | Read methods |
|---|---|
| `register_app(name, domain, description)` | `get_all_apps()` |
| `create_template(app_id, name, case_type, rules, ...)` | `get_app_templates(app_id)` |
| `open_case(app_id, template_id, respondent, ...)` | `get_case(case_id)` |
| `fund_case(case_id)` (payable) | `get_case_verdict(case_id)` |
| `submit_evidence(case_id, type, title, statement, url)` | `get_case_evidence(case_id)` |
| `close_evidence(case_id)` | `get_cases_by_app(app_id)` |
| `request_verdict(case_id)` | `get_cases_by_party(address)` |
| `file_appeal(case_id, basis, argument, ...)` | `get_case_appeals(case_id)` |
| `request_appeal_review(case_id, appeal_id)` | `get_all_cases()` |
| `finalize_case(case_id)` | |
| `claim_settlement(case_id)` | |

Example integration:

```ts
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({ chain: studionet, account: createAccount(privateKey) });

// Register once
const registerTx = await client.writeContract({
  address: "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE",
  functionName: "register_app",
  args: ["MyApp", "myapp.com", "A marketplace for digital goods."],
});

// Open a case later
const caseTx = await client.writeContract({
  address: "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE",
  functionName: "open_case",
  args: [appId, templateId, respondentAddress, caseSummary, requestedRemedy, evidenceDeadline],
});

// Read the verdict
const verdict = await client.readContract({
  address: "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE",
  functionName: "get_case_verdict",
  args: [caseId],
});
```

**Who this is for:** Teams with blockchain experience that want full control over their dispute flow. They build their own frontend and call the contract directly.

#### 2. DisputeOS Reference Console

Teams can use this repository's Next.js frontend as an admin console to manage apps, templates, cases, evidence, verdicts, and settlements without building UI from scratch.

The console covers the full lifecycle:

- `/apps/register` — register an app
- `/apps/[appId]/templates/create` — define a dispute template
- `/cases/open` — open and fund a case
- `/cases/[caseId]/evidence` — submit evidence, close the evidence window
- `/cases/[caseId]/verdict` — request and view the AI verdict
- `/cases/[caseId]/appeal` — file an appeal, request appeal review
- `/cases/[caseId]` — case room with timeline, settlement rail, and status

**Who this is for:** Teams evaluating DisputeOS, operators managing disputes manually, or apps that want a ready-made admin surface while building their own user-facing integration.

#### 6. External Settlement Mode

Some apps do not want DisputeOS to hold or move funds. They use the contract only for judgement, then settle externally using the verdict data.

In this mode, the template's `settlement_mode` is set to `external_settlement_instruction` or `non_monetary_verdict`. The contract stores the canonical verdict (winner, split, reason, confidence) but `claim_settlement` does not transfer GEN — it just marks the case settled.

The integrating app reads `get_case_verdict(case_id)` and executes settlement on its own ledger:

```json
{
  "verdict": "complainant_wins",
  "winner": "complainant",
  "complainant_bps": 7000,
  "respondent_bps": 3000,
  "reason_code": "incomplete_delivery",
  "short_reason": "Builder delivered 3 of 4 requirements. Missing contact form."
}
```

**Who this is for:** SaaS apps that refund through Stripe, DAO tools that adjust contributor rewards, bounty platforms with their own escrow, AI agent networks that update reputation — any team that needs a neutral judgement but already has its own money flow.

#### 7. Full Protocol Mode

Apps use DisputeOS as the entire dispute layer: GEN escrow, structured evidence intake, non-deterministic AI validator review, appeals, and on-chain settlement.

This is the default mode in the reference console. The complainant funds the case with GEN, both parties submit evidence, evidence closes, the validator issues a verdict with a bps split, the appeal window runs, and `claim_settlement` moves GEN to each party according to the split.

**Who this is for:** Apps that want the full trust-minimized dispute lifecycle without building any of it. Especially useful for crypto-native marketplaces, escrow tools, and bounty platforms where funds are already on-chain.

#### 3. SDK Package (`packages/sdk`) — IMPLEMENTED

A TypeScript SDK wrapping every contract call and read is shipped in `packages/sdk/` (see `packages/sdk/README.md` for the full API):

```ts
import { DisputeOS } from "@disputeos/sdk";

const disputeOS = new DisputeOS({ contractAddress: "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE" });

const appId = await disputeOS.registerApp({ name, domain, description });
const templateId = await disputeOS.createTemplate({ appId, name, caseType, rules, /* ... */ });
const caseId = await disputeOS.openCase({ appId, templateId, respondent, /* ... */ });
await disputeOS.submitEvidence({ caseId, evidenceType, title, statement, publicUrl });
await disputeOS.requestVerdict({ caseId });

const verdict = await disputeOS.getCaseVerdict(caseId);
const caseData = await disputeOS.getCase(caseId);
```

It wraps GEN value conversion, receipt polling, and status/bps formatting helpers (`formatGEN`, `formatBps`, `statusLabel`, `verdictLabel`, `canSubmitEvidence`, etc. — see `packages/sdk/src/helpers.ts`). It also has typed wrappers for `resolve_manual_review`, `grant_role`, `revoke_role`, `set_protocol_fee`, `get_app_roles`, and `get_protocol_fee_info`.

**Who this is for:** Any JS/TS app that wants to integrate without hand-rolling `genlayer-js` calls.

#### 4. Embeddable Widgets (`components/widgets`) — IMPLEMENTED

Drop-in React components, shipped in `components/widgets/`:

```tsx
<DisputeOSProvider>
  <OpenDisputeButton appId={1} templateId={1} />
  <EvidenceSubmissionWidget caseId={123} />
  <CaseStatusWidget caseId={123} />
  <VerdictWidget caseId={123} />
  <SettlementWidget caseId={123} />
</DisputeOSProvider>
```

See `docs/examples/widget-usage.tsx` for a full worked example. These are React components only — no non-React web-component build exists yet, and there is no concrete plan to add one.

**Who this is for:** Marketplaces and SaaS apps that want dispute UI without building it from scratch.

### Live Protocol Administration Features

The items below exist in `contract/disputeos_protocol.py`, have matching frontend UI, and are live in the current StudioNet deployment. Full detail and future redeploy notes: [`FUTURE_CONTRACT_CHANGES.md`](FUTURE_CONTRACT_CHANGES.md).

- **Manual Review Resolver** — `resolve_manual_review(...)`, app-owner-only, resolves cases stuck in `manual_review_required`.
- **App Roles** — `grant_role` / `revoke_role` / `get_app_roles`, delegated `admin`/`moderator` access per app.
- **Protocol Fee** — `set_protocol_fee` / `get_protocol_fee_info`, a capped (≤10%) basis-point cut of escrowed settlements.

### Integration Mode Summary

| Mode | Available | Effort | Best For |
|---|---|---|---|
| Direct Contract | **Today** | High (raw calls) | Blockchain-native teams |
| Reference Console | **Today** | Low (use as-is) | Evaluation, admin, ops |
| External Settlement | **Today** | Medium | Apps with own money flow |
| Full Protocol | **Today** | Medium | Crypto-native escrow apps |
| SDK | **Today** | Low (npm install / copy package) | Any JS/TS app |
| Embeddable Widgets | **Today** | Very low (drop-in) | Marketplaces, SaaS |
| Manual review / roles / fees | **Today** | Low | Ops teams, multi-fee integrators |
| Hosted / Managed | Not in current scope | None (SaaS) | Non-crypto teams |

---

## 1. Shared DisputeOS Protocol

### What It Means

Apps use the deployed `DisputeOSProtocol` contract directly.

Each app registers itself on-chain, creates its own dispute templates, and opens cases against those templates.

The app keeps its own product and user experience. DisputeOS handles the dispute logic.

### Who It Is For

- Marketplaces
- Bounty platforms
- Escrow tools
- Creator platforms
- DAO tooling
- AI agent networks
- Service booking apps
- Paid communities

### Why It Matters

This is the strongest version of the reusable Intelligent Contract story.

Many apps can share one dispute engine without copying the code, deploying their own arbitration contract, or building custom evidence/verdict/appeal logic.

### Integration Shape

An app calls:

```text
register_app(...)
create_template(...)
open_case(...)
submit_evidence(...)
request_verdict(...)
file_appeal(...)
claim_settlement(...)
```

### Product Positioning

Use this line:

> Apps plug into DisputeOS the way products plug into Stripe: they keep their own UX, but outsource a hard trust layer.

### Implementation Priority

High.

This is the base product. Everything else should make this easier to use.

---

## 2. TypeScript SDK — IMPLEMENTED

Shipped in `packages/sdk/`. See the "Available Today" section above for a usage example, and `packages/sdk/README.md` for the full method reference. The package covers every contract read/write method (register app through claim settlement, plus the pending manual-review/roles/fee methods), GEN value conversion, receipt polling, and formatting helpers (`formatGEN`, `formatBps`, `statusLabel`, `verdictLabel`, `canSubmitEvidence`, `canRequestVerdict`, `canAppeal`, `canFinalize`, `canClaimSettlement`).

---

## 3. Embeddable Case Widgets — IMPLEMENTED

Shipped in `components/widgets/`: `DisputeOSProvider`, `OpenDisputeButton`, `EvidenceSubmissionWidget`, `CaseStatusWidget`, `VerdictWidget`, `SettlementWidget`. See the "Available Today" section above and `docs/examples/widget-usage.tsx`. These are React components only — no non-React web-component build exists, and there's no concrete plan to add one (would be a new, separate effort, not a natural extension of the current widget code).

---

## 4. External Settlement Mode

### What It Means

Not every app wants DisputeOS to hold funds.

In external settlement mode, DisputeOS judges the case and stores the canonical verdict, but the integrating app executes settlement elsewhere.

Example:

```json
{
  "verdict": "split_settlement",
  "winner": "split",
  "complainant_bps": 7000,
  "respondent_bps": 3000,
  "instruction": "refund_70_percent_to_client"
}
```

### Why It Matters

Many B2B apps already have their own ledger, database, wallet system, escrow account, or off-chain business workflow.

They may only need neutral judgement, not fund custody.

### Integration Examples

- A SaaS marketplace refunds an invoice in Stripe.
- A DAO tool adjusts contributor reward allocation.
- A bounty platform releases stablecoin from its own escrow.
- An AI agent network updates reputation or task state.
- A paid community grants, revokes, or extends access.

### Contract Direction

The current contract already includes settlement mode concepts. Future versions can make external settlement richer by storing:

```text
settlement_instruction
settlement_asset
external_reference
execution_deadline
integrator_acknowledged
```

### Implementation Priority

High for B2B adoption.

Escrow is great for a demo, but external settlement makes DisputeOS usable by more real apps.

---

## 5. Private / Enterprise Deployments

### What It Means

Some teams may deploy their own instance of `DisputeOSProtocol`.

They might do this for:

- Custom governance
- App-specific settlement rules
- Compliance requirements
- Separate data visibility
- High-volume usage
- Custom validator prompts
- Protocol branding

### Positioning

This should not be the default pitch.

Default:

> Plug into the shared DisputeOS protocol.

Enterprise/custom:

> Deploy a private DisputeOS instance if your app needs isolation or custom policy.

### Implementation Priority

Medium.

Useful later, but not the first thing to optimize for.

---

## 6. App Developer Dashboard

### What It Means

The current reference console can evolve into a real dashboard for integrators.

Instead of being only a demo, it could become the place app teams:

- Register apps.
- Create templates.
- View cases.
- Monitor verdicts.
- Export integration snippets.
- Track settlement state.
- Manage API keys or widget settings.

### Important Boundary

The dashboard should not become the core product.

The product remains the contract/protocol. The dashboard is an operator surface.

### Implementation Priority

Medium.

Good for demos and operations, but SDK/protocol usability matters more.

---

## 7. Template Marketplace

### What It Means

A registry of reusable dispute templates.

Examples:

- Freelance delivery dispute
- Shipment proof dispute
- Bounty completion dispute
- Paid community access dispute
- AI agent task failure
- DAO contributor reward dispute
- Course refund dispute
- Escrow milestone dispute

### Why It Matters

New integrators could start from known template patterns rather than writing their own rules from scratch.

### Implementation Priority

Medium-low initially.

Useful once enough real use cases exist.

---

## 8. Reputation And Dispute History

### What It Means

Track dispute participation and outcomes across apps.

Possible signals:

- Cases opened
- Cases won/lost
- Settlement reliability
- Evidence quality
- Repeated manual review
- Appeal success rate

### Caution

This is powerful but sensitive.

Reputation can become unfair if context is missing. It should not be rushed.

### Implementation Priority

Low for MVP.

Consider later after the core dispute engine is trusted.

---

## Not In Current Scope / Requires Backend Later

These are real future directions but are **not being built now**, because they inherently need infrastructure this project deliberately doesn't have: a database, an auth/API-key layer, and a notification/webhook dispatcher. None of this can be done as a contract change or a frontend change alone.

- **Hosted / managed DisputeOS** — a SaaS dashboard with team accounts, per-app API keys, and managed case tracking without reading the chain directly.
- **Webhook callbacks** — notifying an integrator's backend when a case is funded, evidence is submitted, a verdict issues, or a settlement completes.
- **Email / notification delivery** — telling a complainant or respondent their case status changed.
- **Off-chain case indexing** — a service that polls `get_all_cases()`/`get_case()` on a schedule and serves a fast, filterable, historical view (also blocked on GenVM not supporting Ethereum-style events yet — see `FUTURE_CONTRACT_CHANGES.md` section E).

If/when any of these become a real priority, they should be scoped as a genuinely new backend service, not squeezed into the contract or the reference console.

## Recommended Build Order

### Phase 1: Stabilize MVP — DONE

- Manual test the full flow on StudioNet. ✅
- Confirm contract methods work end to end. ✅
- Verify app registration, template creation, case funding, evidence, verdict, appeal, finalization, and claim settlement. ✅
- Improve error messages where manual testing reveals friction. ✅ (JSON-fallback verdict handling)

### Phase 2: SDK — DONE

- `packages/sdk/` wraps every read/write contract call, exports TypeScript types, and includes status/GEN/bps formatting helpers. See "Available Today" above.

### Phase 3: React Widgets — DONE

- `components/widgets/` ships `DisputeOSProvider`, `OpenDisputeButton`, `EvidenceSubmissionWidget`, `CaseStatusWidget`, `VerdictWidget`, `SettlementWidget`, all built on the SDK. See "Available Today" above.

### Phase 4: Contract Roadmap Items — Live

- Manual Review Resolver, App Roles, and Protocol Fee are written, frontend-wired, and live in the current StudioNet deployment (see the "Live Protocol Administration Features" section above and `FUTURE_CONTRACT_CHANGES.md`).

### Phase 5: External Settlement — Live Today, Room to Expand

- The `external_settlement_instruction` / `non_monetary_verdict` settlement modes already work today (see "Available Today" above). Expanding the instruction schema (`settlement_instruction`, `settlement_asset`, `external_reference`, `execution_deadline`, `integrator_acknowledged` fields) remains a real future option, not yet scheduled.

### Phase 6: Private Deployments

- Document private deployment flow, configuration templates, and custom contract address support in the SDK/widgets. Not yet scheduled.

---

## Team Decision Questions

Use these questions to decide what to build next:

1. Are we pitching DisputeOS as a shared protocol or as code teams deploy themselves?
2. Do we want the next artifact to be an SDK, a widget, or more dashboard polish?
3. Should the first customer story be escrow settlement or external settlement instruction?
4. Do we want one canonical deployed contract address for demos and partners?
5. Should the reference console become an operator dashboard or stay purely as a demo?
6. What is the first real integration target: marketplace, bounty platform, DAO tool, or AI agent network?

Recommended answers for now:

```text
Shared protocol first.
SDK next.
Widgets after SDK.
Escrow for demo, external settlement for B2B.
Reference console stays as proof/operator surface.
First target: marketplaces and bounty platforms.
```

---

## One-Line Future Vision

> DisputeOS becomes the dispute API for apps: a reusable judgement protocol, an SDK for developers, and embeddable case tools for teams that do not want to build arbitration from scratch.
