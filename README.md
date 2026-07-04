<p align="center">
  <img src="./public/disputeos-mark.svg" alt="DisputeOS logo" width="112" />
</p>

<h1 align="center">DisputeOS</h1>

<p align="center">
  <strong>A reusable GenLayer Intelligent Contract for resolving product, marketplace, escrow, DAO, and service disputes.</strong>
</p>

<p align="center">
  DisputeOS gives apps a judgement layer: evidence intake, AI-assisted validator review, appeals, manual review, role-based operations, and settlement instructions without every team building their own court.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> |
  <a href="#six-ways-to-use-disputeos">Six Ways To Use It</a> |
  <a href="#manual-testing-with-real-demo-data">Manual Testing</a> |
  <a href="#contract-api">Contract API</a> |
  <a href="#deployment">Deployment</a>
</p>

---

## Current Deployment

DisputeOS is currently deployed on **GenLayer StudioNet** at:

```txt
0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE
```

This deployment includes:

| Capability | Status | Notes |
| --- | --- | --- |
| Reusable app registration | Live | Any team can register an app namespace. |
| Reusable dispute templates | Live | Each app can define its own case type, evidence rules, outcomes, and settlement mode. |
| Case opening and evidence intake | Live | Parties can submit structured text evidence before the deadline. |
| Validator verdict requests | Live | GenLayer validators evaluate evidence and return a structured verdict. |
| JSON fallback handling | Live | The contract can fall back to manual review if validator output is invalid. |
| Appeals | Live | Eligible `verdict_issued` cases can be appealed within the configured appeal window. |
| Manual review resolver | Live | App owners can resolve `manual_review_required` cases with a validated split. |
| App roles | Live | App owners can grant and revoke moderator/admin roles. |
| Protocol fee | Live | Protocol admin can set a capped fee deducted from eligible escrow settlements. |
| Reference console | Live locally / deployable | A Next.js app for testing and demonstration. |
| TypeScript SDK | Included | Reusable client wrapper for product teams. |
| Embeddable React widgets | Included | Reusable UI pieces for teams that do not want the full console. |

The deployed contract address should be configured in `.env.local` and in any hosted environment:

```bash
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE
```

---

## What Is DisputeOS?

Most apps eventually need a way to handle conflict:

- A freelancer says they delivered work; a client says they did not.
- A buyer says an item was misrepresented; a seller says it was accurate.
- A DAO contributor says they completed a milestone; the treasury says the work is incomplete.
- A SaaS customer wants a refund; the vendor says the terms were met.
- Two users need a neutral review of evidence before money, access, reputation, or moderation action changes hands.

DisputeOS is a reusable dispute resolution protocol for those situations. It does not assume one app, one marketplace, or one type of dispute. Instead, each integrating team registers an app, defines one or more dispute templates, opens cases against those templates, submits evidence, requests validator judgement, and uses the result either to settle escrow on-chain or to trigger external business logic.

The contract is the product. The web app in this repository is a reference console that shows how teams can interact with the protocol, test flows, and reuse UI patterns.

---

## What DisputeOS Is Not

DisputeOS is not a traditional Web2 customer support desk, not a centralized arbitration service, and not a general-purpose file storage platform.

It does not decide disputes from hidden backend logic. The important case state lives in the GenLayer Intelligent Contract. The frontend helps users submit and inspect that state.

It also does not force every team to use the DisputeOS UI. Teams can use the protocol directly, use the SDK, embed widgets, or treat the live console as a reference implementation.

---

## Repository Contents

```txt
app/                         Next.js App Router pages for the reference console
components/                  Shared UI, wallet, layout, dispute, and admin components
contract/disputeos_protocol.py
                             GenLayer Intelligent Contract
docs/                        Integration, manual testing, and planning docs
lib/                         Frontend contract client, constants, types, and utilities
packages/sdk/                TypeScript SDK for external integrations
public/disputeos-mark.svg    Logo used by the app and README
app/icon.svg                 Favicon / app icon
browser-injected.md          Notes for the old browser-managed session wallet pattern
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Contract | GenLayer Intelligent Contract, Python-style contract syntax |
| Network | GenLayer StudioNet |
| Frontend | Next.js 15.5.20, React 19, TypeScript |
| Styling | Tailwind CSS |
| Wallet | Injected EIP-1193 wallet first, optional test/session wallet fallback |
| SDK | TypeScript source package in `packages/sdk` |
| Deployment target | Vercel or any Node-compatible Next.js host |

---

## Quick Start

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
```

Start the reference console:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Run checks:

```bash
npm run lint
npm run build
```

---

## Wallet Flow

DisputeOS currently uses an **injected wallet first** model.

That means the app should work with wallets that expose an EIP-1193 provider in the browser, such as MetaMask, Rabby, or another compatible injected wallet. The UI should not depend on one specific wallet brand.

Expected behavior:

1. User clicks **Connect Wallet**.
2. Browser wallet prompts the user to connect.
3. The connected address appears in the header.
4. Contract calls are signed by the wallet.
5. DisputeOS does not store, reveal, or manage the user's real wallet private key.

There is also a test/session wallet fallback for local development and demos. That pattern is documented separately in [`browser-injected.md`](./browser-injected.md), because it may be useful for another project. It should not be treated as the primary production wallet path for DisputeOS.

If multiple wallet extensions are installed, the browser may show provider conflict warnings in DevTools. The app should still select a compatible injected provider and avoid hard-coding one wallet brand.

---

## Core Concepts

### App

An app is a product, marketplace, DAO, SaaS platform, game, protocol, or community that wants to use DisputeOS.

The app registers:

- name
- domain
- description
- owner address
- active status

Each app receives an `app_id`.

### Template

A template is a reusable dispute type owned by an app.

Examples:

- Freelance Delivery Dispute
- Marketplace Item Misrepresentation
- DAO Milestone Review
- Refund Eligibility Dispute
- Content Moderation Appeal
- Subscription Cancellation Dispute

Each template defines:

- title
- category
- policy
- evidence standard
- allowed outcomes
- settlement mode
- whether appeals are enabled
- appeal window
- whether the template is public

Each template receives a `template_id`.

### Case

A case is a live dispute opened from a template.

Each case includes:

- app id
- template id
- complainant
- respondent
- case summary
- requested remedy
- evidence deadline
- current status
- verdict data once decided
- settlement data once claimed

### Evidence

Evidence is submitted by the complainant or respondent before the evidence window closes.

Evidence is currently text/URI based. Teams can submit:

- short written claims
- IPFS links
- GitHub links
- deployment URLs
- invoice links
- screenshots hosted elsewhere
- transaction references
- communication summaries

The contract is not intended to store large files directly.

### Verdict

The validator verdict is expected to include structured judgement data, including:

- outcome
- confidence
- reasoning
- recommended split
- settlement instruction
- whether manual review is required

If the validator output cannot be parsed as valid JSON, the contract can move the case into `manual_review_required` instead of breaking the entire flow.

### Settlement

Settlement can mean different things depending on the template:

- release escrow
- refund
- split payment
- external settlement instruction
- non-monetary decision
- manual follow-up

DisputeOS is designed so teams can use the judgement layer even when the final settlement happens somewhere else.

---

## Case Lifecycle

The standard lifecycle is:

```txt
register_app
  -> create_template
  -> open_case
  -> fund_case / activate case flow where required
  -> submit_evidence
  -> close_evidence
  -> request_verdict
  -> verdict_issued OR manual_review_required
  -> file_appeal where enabled and within appeal window
  -> request_appeal_review where an appeal was filed
  -> finalize_case where no appeal was filed and the appeal window has passed
  -> claim_settlement OR resolve_manual_review
  -> settled
```

Status names used by the protocol include:

| Status | Meaning |
| --- | --- |
| `opened` | Case has been created. |
| `evidence_open` | Evidence can be submitted. |
| `evidence_closed` | Evidence window is closed and verdict can be requested. |
| `verdict_issued` | A verdict exists and the appeal window may still be open. |
| `appeal_window_open` | A valid appeal was filed and needs appeal review. |
| `appeal_under_review` | Appeal review is in progress. |
| `finalized` | Appeal flow is resolved or no appeal can be filed; settlement can proceed if applicable. |
| `manual_review_required` | Validator output was invalid or manual review was requested. |
| `settled` | Settlement or settlement instruction has been completed. |

---

## Six Ways To Use DisputeOS

DisputeOS can be used in six practical ways today.

### 1. Direct Contract Integration

Best for teams that already have their own frontend or backend and only want the on-chain judgement layer.

Use this when:

- you already have an app UI
- you want full control over user experience
- you only need DisputeOS for case state, evidence, verdicts, roles, and settlement logic

Implementation steps:

1. Connect your app to GenLayer StudioNet.
2. Point your client to the deployed DisputeOS contract address.
3. Call `register_app(name, domain, description)` once for your product.
4. Store the returned `app_id` in your own config.
5. Call `create_template(...)` for each dispute type you support.
6. When a user opens a dispute, call `open_case(...)`.
7. Submit evidence using `submit_evidence(...)`.
8. Close evidence using `close_evidence(...)` when the deadline is reached or both sides are ready.
9. Request judgement using `request_verdict(case_id)`.
10. If the result is `verdict_issued`, allow appeal or call `finalize_case(case_id)` after the appeal window.
11. Read the finalized verdict and use it to settle funds, update internal state, or trigger external workflows.

Minimal integration shape:

```ts
import { DisputeOS } from "./packages/sdk/src";

const disputeOS = new DisputeOS({
  contractAddress: "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE",
  rpcUrl: "https://studio.genlayer.com/api",
  walletClient,
});

const appId = await disputeOS.registerApp({
  name: "BuildMarket",
  domain: "buildmarket.example",
  description: "A marketplace connecting clients with freelance builders.",
});
```

Direct contract integration gives the deepest control, but the team must build its own UX around each step.

### 2. Reference Console

Best for demos, internal ops, protocol testing, onboarding, and teams that want to understand the full workflow before integrating.

Use this when:

- you want to pitch or demo DisputeOS quickly
- you want a visible admin/operator interface
- you want to test contract flows without building your own UI first
- you want to inspect how each contract method is used

Implementation steps:

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Add `.env.local` with the deployed contract address.
4. Run `npm run dev`.
5. Connect an injected wallet.
6. Use **Register Demo App** or `/apps/register` to register a test app.
7. Create a dispute template from the app page.
8. Open a case from the template.
9. Submit evidence.
10. Close evidence.
11. Request verdict.
12. Resolve manual review or claim settlement depending on the verdict.

The reference console is not required for every integration. It exists so teams can see the whole protocol in motion.

### 3. Full Protocol Mode

Best for marketplaces, service platforms, escrow products, and apps that want DisputeOS to manage the dispute lifecycle from opening to settlement.

Use this when:

- DisputeOS should track the full case lifecycle
- parties should submit evidence inside the dispute flow
- the final result should determine release, refund, or split
- the app wants appeals and manual review support

Implementation steps:

1. Register the product as an app.
2. Create templates for the product's dispute categories.
3. Use settlement modes such as `escrow_release`, `refund`, or `split_payment` where the contract should control payout logic.
4. Open a case with the respondent, summary, requested remedy, and evidence deadline.
5. Activate/fund the case according to the template and product flow.
6. Allow each side to submit evidence.
7. Close evidence.
8. Request validator verdict.
9. If the case is `verdict_issued`, allow eligible parties to appeal within the appeal window.
10. If no appeal is filed, finalize the case after the appeal window.
11. If the case requires manual review, let the app owner resolve it through the manual review resolver.
12. If the case is finalized, allow settlement claim.

This is the most complete use of DisputeOS.

### 4. External Settlement / Judgement-Only Mode

Best for apps that want decentralized judgement but need to execute the final action outside DisputeOS.

Use this when:

- money sits in another escrow contract
- funds are held by a marketplace wallet
- the result should update a database, reputation score, moderation state, access permission, or DAO workflow
- the dispute is not about GEN payout

Implementation steps:

1. Register your app.
2. Create a template whose `settlement_mode` represents an external or non-monetary action.
3. In the template policy, clearly explain how the decision will be applied by your app.
4. Open cases normally.
5. Submit evidence and request verdict normally.
6. Read the verdict outcome, split, and settlement instruction.
7. Execute the real business action in your app, backend, DAO tooling, or separate escrow contract.
8. Store the DisputeOS case id and transaction hash in your own system as an audit reference.

Important operational note: judgement-only integrations should be careful not to treat DisputeOS as the final custodian of funds unless the template is using an escrow settlement mode designed for that. If your product keeps funds elsewhere, use the DisputeOS verdict as the authoritative instruction and execute the movement in your own settlement system.

Example external actions:

| Verdict | External app action |
| --- | --- |
| `complainant_wins` | Refund buyer in marketplace database. |
| `respondent_wins` | Release external escrow to seller. |
| `split_settlement` | Split stablecoin escrow in another contract. |
| `insufficient_evidence` | Keep funds locked and ask for more evidence. |
| `manual_review_required` | Route to human/operator panel. |

### 5. TypeScript SDK Integration

Best for teams that want contract access without copying frontend internals.

Use this when:

- you are building your own app
- you want typed wrappers for DisputeOS calls
- you want to avoid manually formatting every contract call
- you may later swap UI without rewriting protocol access

Implementation steps:

1. Import the SDK source from `packages/sdk/src`, or package/publish it inside your own workspace.
2. Initialize the client with contract address, RPC URL, and wallet client.
3. Register or load your `app_id`.
4. Create or load template ids.
5. Use SDK methods from your product flows.
6. Keep your own product state synced to DisputeOS case ids.

Example:

```ts
import { DisputeOS } from "./packages/sdk/src";

const client = new DisputeOS({
  contractAddress: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS!,
  rpcUrl: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL!,
  walletClient,
});

await client.openCase({
  appId: 1,
  templateId: 1,
  respondent: "0x52d8321d9bd63569846fdD72a78492276c91D959",
  summary:
    "Client says the builder failed to deliver. Builder says the link was submitted before the deadline.",
  requestedRemedy: "refund_70_percent",
  evidenceDeadline: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
});
```

### 6. Embeddable React Widgets

Best for teams that want DisputeOS inside their existing app without sending users to the full reference console.

Use this when:

- you have your own product UI
- you only want small dispute components
- you want users to stay inside your app
- you want to reuse tested UI patterns

Implementation steps:

1. Copy or import the relevant components from `components/dispute`.
2. Provide your app's wallet and contract client context.
3. Mount the widget where your product needs it.
4. Pass `appId`, `templateId`, `caseId`, or party addresses as props.
5. Keep navigation inside your own product.

Current reusable dispute components include:

| Component | Use |
| --- | --- |
| `TemplateRegistry` | Show templates for an app. |
| `EvidencePort` | Render one evidence item. |
| `ManualReviewPanel` | Resolve a case in manual review. |
| `SettlementRail` | Show escrow split and protocol fee preview. |
| `RoleManager` | Manage app roles from an owner view. |
| `VerdictKernel` | Render a structured verdict. |
| `CaseTimeline` | Show case progress. |

Example:

```tsx
<TemplateRegistry
  appId={1}
  templates={templates}
/>
```

```tsx
<EvidencePort
  evidence={evidence}
  role="complainant"
/>
```

```tsx
<ManualReviewPanel
  caseId={1}
  template={template}
  onResolved={refetchCase}
/>
```

Widgets are a middle path between direct contract usage and the full hosted console.

---

## What To Pitch To A Team

Short version:

> DisputeOS is a reusable judgement and dispute resolution layer for apps. Instead of every marketplace, DAO, escrow tool, or SaaS platform building its own dispute process, they can plug into DisputeOS, define their policy, collect evidence, request validator judgement, support appeals/manual review, and either settle on-chain or execute the decision in their own system.

Why teams should care:

- It reduces the time needed to build dispute resolution.
- It makes dispute rules explicit through templates.
- It creates an auditable case trail.
- It lets GenLayer validators interpret messy human evidence.
- It supports non-deterministic disputes that normal deterministic smart contracts cannot handle well.
- It can be used as a full protocol or just as a judgement oracle.
- It gives app owners operational controls through roles and manual review.

Good target users:

- freelance marketplaces
- escrow products
- digital goods marketplaces
- DAO grants and bounty programs
- AI agent marketplaces
- SaaS refund workflows
- creator or service platforms
- moderation appeal systems
- games with player-to-player trade disputes

---

## Why GenLayer?

Traditional smart contracts are strong when the inputs are deterministic:

- Did this address pay?
- Did this timestamp pass?
- Is this signature valid?
- Is this number greater than that number?

Disputes are often not deterministic.

They involve:

- competing claims
- vague policies
- screenshots
- delivery links
- deadlines
- intent
- partial completion
- reasonableness
- evidence quality

GenLayer Intelligent Contracts are useful here because validators can evaluate natural language and messy evidence while still producing on-chain state transitions. DisputeOS uses that capability to turn subjective evidence into structured verdicts.

---

## Equivalence Principle

DisputeOS depends on the idea that validators should be able to independently evaluate the same case and converge on an equivalent result.

The contract helps this by giving validators:

- the app's registered identity
- the dispute template policy
- the evidence standard
- allowed outcomes
- case summary
- requested remedy
- evidence from both parties

The better the template policy and evidence standard, the more consistent verdicts should be.

---

## Contract API

The main contract file is:

```txt
contract/disputeos_protocol.py
```

### App Methods

| Method | Type | Purpose |
| --- | --- | --- |
| `register_app(name, domain, description)` | write | Register a product or integration. |
| `get_app(app_id)` | read | Fetch one registered app. |
| `get_apps()` | read | Fetch registered apps. |
| `grant_role(app_id, address, role)` | write | Grant app-level moderator/admin role. |
| `revoke_role(app_id, address)` | write | Remove app-level role. |
| `get_app_roles(app_id)` | read | Inspect roles for an app. |

### Template Methods

| Method | Type | Purpose |
| --- | --- | --- |
| `create_template(...)` | write | Create a reusable dispute type. |
| `get_template(template_id)` | read | Fetch one template. |
| `get_templates(app_id)` | read | Fetch templates for an app. |

### Case Methods

| Method | Type | Purpose |
| --- | --- | --- |
| `open_case(app_id, template_id, respondent, summary, requested_remedy, evidence_deadline)` | write | Open a new dispute. |
| `fund_case(case_id)` | write/payable | Fund or activate the dispute flow where required. |
| `respond_to_case(case_id, response_statement)` | write | Store a respondent statement before evidence. |
| `submit_evidence(case_id, evidence_type, title, statement, public_url)` | write | Submit evidence as a party. |
| `close_evidence(case_id)` | write | Close the evidence window. |
| `request_verdict(case_id)` | write | Ask validators to decide the case. |
| `file_appeal(case_id, basis, statement, evidence_urls)` | write | File an appeal while the appeal window is open. |
| `request_appeal_review(case_id)` | write | Ask validators to review a filed appeal. |
| `finalize_case(case_id)` | write | Finalize an unappealed verdict after the appeal window. |
| `claim_settlement(case_id)` | write | Claim escrow settlement where applicable. |
| `resolve_manual_review(case_id, verdict, winner, complainant_bps, respondent_bps, reason_code, short_reason)` | write | App owner resolves manual review case. |
| `get_case(case_id)` | read | Fetch one case. |
| `get_case_evidence(case_id)` | read | Fetch evidence for one case. |
| `get_case_verdict(case_id)` | read | Fetch verdict for one case. |
| `get_case_appeal(case_id)` | read | Fetch appeal data for one case. |
| `get_cases_by_app(app_id)` | read | Fetch cases opened under an app. |
| `get_cases_by_party(address)` | read | Fetch cases involving an address. |
| `get_all_cases()` | read | Fetch all case summaries. |

### Protocol Admin Methods

| Method | Type | Purpose |
| --- | --- | --- |
| `set_protocol_fee(recipient, fee_bps)` | write | Set protocol fee, capped by contract rules. |
| `get_protocol_fee_info()` | read | Read protocol fee state. |

---

## Admin Features

### Manual Review Resolver

Manual review exists because validator output can fail or the correct outcome may require a human/operator decision.

The resolver lets the app owner finalize a case that is in `manual_review_required`.

Typical use:

1. Open the case verdict page.
2. Confirm the case status is `manual_review_required`.
3. Enter outcome.
4. Enter complainant/respondent split in basis points.
5. Add reasoning.
6. Submit resolution.
7. Case moves to finalized/settlement flow.

Basis points must add up correctly for split-style outcomes.

### App Roles

App owners can grant roles to operational addresses.

Supported role idea:

| Role | Intended use |
| --- | --- |
| Moderator | Help close evidence and operate case flow. |
| Admin | Higher-trust app operator role. |

Roles do not make the address the protocol owner. They are scoped to the app.

### Protocol Fee

The protocol can deduct a capped fee from eligible escrow settlements.

The fee is configured by the protocol admin and read through:

```txt
get_protocol_fee_info()
```

The reference UI includes an admin page for fee visibility/configuration where supported by the connected contract.

---

## Manual Testing With Real Demo Data

Use this data to test the complete flow on StudioNet.

### Test Wallets

Use one connected injected wallet as the complainant/app owner. Use this respondent address for demos:

```txt
0x52d8321d9bd63569846fdD72a78492276c91D959
```

### 1. Register App

Route:

```txt
/apps/register
```

Data:

| Field | Value |
| --- | --- |
| Name | `BuildMarket` |
| Domain | `buildmarket.example` |
| Description | `A marketplace connecting clients with freelance builders for landing page delivery projects.` |

Expected:

- Wallet prompts for signature.
- Explorer shows `register_app`.
- UI shows app in `/apps`.
- New app id is likely `1` on a fresh deployment.

### 2. Create Template

Route:

```txt
/apps/1/templates/create
```

Data:

| Field | Value |
| --- | --- |
| Title | `Freelance Delivery Dispute` |
| Category | `freelance_delivery` |
| Policy | `The builder must deliver a responsive landing page, working contact form, GitHub source code, and deployment link before the deadline.` |
| Evidence standard | `Scope agreement, delivery links (GitHub + deployed URL), and any communication about the deadline.` |
| Allowed outcomes | `complainant_wins`, `respondent_wins`, `split_settlement`, `insufficient_evidence`, `manual_review_required` |
| Settlement mode | `escrow_release` |
| Appeals enabled | `true` |
| Appeal window | `300` |
| Public | `true` |

Expected:

- Wallet prompts for signature.
- Explorer shows `create_template`.
- Template appears under the app page.

### 3. Open Case

Route:

```txt
/cases/open
```

Data:

| Field | Value |
| --- | --- |
| App ID | `1` |
| Template ID | `1` |
| Respondent | `0x52d8321d9bd63569846fdD72a78492276c91D959` |
| Case summary | `Client says the builder failed to deliver the agreed landing page. Builder says they completed the page and submitted the link before the deadline.` |
| Requested remedy | `refund_70_percent` |
| Evidence deadline | 2-3 days in the future |

Expected:

- Explorer shows `open_case`.
- UI navigates or allows navigation to the case page.
- New case id is likely `1` on a fresh deployment.

### 4. Fund / Activate Case

Route:

```txt
/cases/1
```

Use the funding panel if the selected template requires escrow activation.

Demo amount:

```txt
10 GEN
```

Expected:

- Wallet prompts for transaction.
- Balance decreases after finalization.
- Case moves into evidence intake.

### 5. Submit Complainant Evidence

Route:

```txt
/cases/1/evidence
```

Evidence URI:

```txt
https://github.com/buildmarket-demo/landing-page-dispute/issues/1
```

Evidence summary:

```txt
The client provided the original scope agreement, the agreed deadline, and messages showing that no final deployment link was received before the deadline.
```

Expected:

- Explorer shows `submit_evidence`.
- Evidence appears under complainant evidence after refresh.

### 6. Submit Respondent Evidence

If testing from the same wallet is allowed in your local flow, submit respondent-style evidence for demonstration. For stricter party testing, switch to the respondent wallet.

Evidence URI:

```txt
https://buildmarket-demo.vercel.app
```

Evidence summary:

```txt
The builder provided a deployed landing page link and GitHub repository, claiming both were sent before the deadline in the project chat.
```

Expected:

- Explorer shows a second `submit_evidence`.
- Evidence appears under respondent evidence if submitted by the respondent, or under the submitting party if testing with one wallet.

### 7. Close Evidence

Route:

```txt
/cases/1/evidence
```

Click:

```txt
Close Evidence
```

Expected:

- Explorer shows `close_evidence`.
- Case moves to verdict-ready state.

### 8. Request Verdict

Route:

```txt
/cases/1/verdict
```

Click:

```txt
Request Verdict
```

Expected success path:

- Explorer shows `request_verdict`.
- Case receives a structured verdict.
- Case status becomes `verdict_issued`.
- If appeals are enabled, wait for the appeal window to pass before finalizing.

Expected fallback path:

- If validator JSON is invalid or consensus fails, case may become `manual_review_required`.
- Use the manual review resolver as app owner.

### 9. Finalize Unappealed Verdict

Route:

```txt
/cases/1/verdict
```

If the case is `verdict_issued` and no appeal was filed, wait until the appeal window passes.

For the demo template above, that means:

```txt
300 seconds
```

Then call:

```txt
Finalize Case
```

Expected:

- Explorer shows `finalize_case`.
- Case status becomes `finalized`.
- Settlement can proceed.

### 10. Resolve Manual Review

Route:

```txt
/cases/1/verdict
```

Example manual resolution:

| Field | Value |
| --- | --- |
| Outcome | `split_settlement` |
| Complainant bps | `7000` |
| Respondent bps | `3000` |
| Reasoning | `The evidence shows partial delivery, but the final deployment and handoff were not completed before the deadline. A 70/30 split reflects incomplete delivery with some useful work provided.` |

Expected:

- Explorer shows `resolve_manual_review`.
- Case moves out of manual review and becomes `finalized`.

### 11. Claim Settlement

Route:

```txt
/cases/1/settlement
```

Expected:

- Eligible party claims settlement.
- Protocol fee is deducted where applicable.
- Case becomes `settled`.

---

## Handling StudioNet RPC Issues

StudioNet can occasionally be busy or fail reads.

Errors you may see:

```txt
Server busy: all 8 execution slots occupied, retry later
```

```txt
GenLayer RPC error (eth_getBalance): "Failed to fetch"
```

Recommended handling:

- wait and retry
- refresh the case page
- check the explorer transaction directly
- avoid clicking the same action repeatedly while a transaction is finalizing
- treat explorer finalization as the source of truth if the UI is temporarily stale

The frontend should continue improving around retry/backoff and post-transaction refresh behavior.

---

## Deployment

### Frontend Deployment

Vercel deployment needs these environment variables:

```bash
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
```

Build command:

```bash
npm run build
```

Output:

```txt
.next
```

### Contract Deployment

Deploy:

```bash
genlayer deploy contract/disputeos_protocol.py
```

After redeploying:

1. Copy the new contract address.
2. Update `.env.local`.
3. Update Vercel environment variables.
4. Update this README if the public deployment address changed.
5. Re-register demo apps and templates, because a new contract has fresh storage.

### Important State Warning

Redeploying the contract creates a new contract with new storage.

Existing apps, templates, cases, verdicts, roles, fees, and settlements from the old address do not automatically move to the new address.

For demos, that is usually fine. For production, teams should plan migrations, archival reads, or app-level mapping before changing addresses.

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` | Yes | Active DisputeOS contract address. |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | Yes | StudioNet RPC endpoint. |
| `NEXT_PUBLIC_GENLAYER_EXPLORER_URL` | Recommended | Explorer base URL for transaction/address links. |

---

## Security And Operational Notes

- Use an injected wallet for real signing.
- Do not paste production private keys into the browser session wallet fallback.
- The reference console is an implementation example, not a replacement for product-specific risk controls.
- Template policies should be precise, because vague policies create weaker verdicts.
- Large files should be stored externally and referenced by URI.
- For high-value escrow, test the full lifecycle with small amounts first.
- Manual review authority should be limited to trusted app owner/admin addresses.
- Protocol fee settings should be reviewed before public use.
- Always confirm final transaction status in the GenLayer Studio Explorer.

---

## Known Limitations

Current limitations:

- StudioNet RPC can be busy or temporarily fail reads.
- Validator JSON can occasionally be invalid, which routes cases to manual review.
- The reference console is not a full production marketplace backend.
- There is no hosted event indexer in this repository.
- There is no notification service for deadlines, appeals, or verdict completion.
- Evidence storage is URI/text based; large binary files should be stored elsewhere.
- Redeployments do not migrate old contract state automatically.

These are product and infrastructure boundaries, not reasons the protocol cannot be used. Teams can integrate DisputeOS today and add backend/indexing/notification layers around it as needed.

---

## Documentation Map

| Document | Purpose |
| --- | --- |
| [`docs/INTEGRATION_GUIDE.md`](./docs/INTEGRATION_GUIDE.md) | Integration guidance for teams plugging into DisputeOS. |
| [`docs/MANUAL_TESTING_GUIDE.md`](./docs/MANUAL_TESTING_GUIDE.md) | Step-by-step manual testing scenarios. |
| [`docs/FUTURE_IMPLEMENTATIONS.md`](./docs/FUTURE_IMPLEMENTATIONS.md) | Product direction and possible implementation ideas. |
| [`docs/FUTURE_CONTRACT_CHANGES.md`](./docs/FUTURE_CONTRACT_CHANGES.md) | Contract change notes and planning history. |
| [`browser-injected.md`](./browser-injected.md) | Browser-managed session wallet pattern kept for reuse in another project. |
| [`packages/sdk`](./packages/sdk) | TypeScript SDK package. |

---

## Development Commands

```bash
npm run dev
```

```bash
npm run lint
```

```bash
npm run build
```

---

## Suggested Demo Script

Use this short script when presenting:

1. "Every app eventually has conflict: refunds, delivery failures, DAO milestones, marketplace disagreements."
2. "Most teams rebuild dispute resolution from scratch. DisputeOS makes it reusable."
3. "An app registers once, creates dispute templates, and opens cases when users disagree."
4. "Both sides submit evidence. GenLayer validators evaluate the messy human context."
5. "The result is structured: outcome, reasoning, confidence, split, and settlement instruction."
6. "The app can use DisputeOS as a full escrow protocol, or just as a judgement layer for its own backend."
7. "App owners also get practical controls: roles, manual review, appeals, and protocol fee support."

One-line close:

> DisputeOS is the reusable dispute layer for apps that need judgement, not just deterministic transactions.

---

## License

No license has been declared yet. Add one before distributing or accepting outside contributions.
