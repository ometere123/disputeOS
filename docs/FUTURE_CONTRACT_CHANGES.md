# Contract Changes

This document catalogs implemented contract changes and ideas that remain outside the current scope.

**Current StudioNet deployment:** `0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE`

The current deployment was redeployed with the project owner's key. That deployer wallet is the `protocol_admin` and controls protocol fee updates.

---

## A. Manual Review Resolver — IMPLEMENTED AND DEPLOYED

**What:** Added `resolve_manual_review(case_id, verdict, winner, complainant_bps, respondent_bps, reason_code, short_reason)`. Only the app owner may call it, only while `case.status == "manual_review_required"`. It creates/overwrites the case's `Verdict`, validates that `complainant_bps + respondent_bps == 10000` and that `verdict`/`winner` are legal categories, sets `appeal_allowed = False` (a manual resolution is final, not re-litigated), and moves the case straight to `status = "finalized"` (skipping `verdict_issued` since there is no appeal window to wait out for a manual call). `claim_settlement` then works exactly as it does for an automated verdict.

**Why existing methods were not enough:** When the LLM consensus produces invalid JSON or an unsupported response, the contract already fell back to `manual_review_required` as a terminal state, but there was no on-chain method to transition a case out of it. The case — and its escrowed funds — were permanently stuck.

**Requires redeploy:** Already redeployed in the current StudioNet address.

**State impact:** Each redeploy creates fresh storage. Apps, templates, cases, evidence, verdicts, and appeals from previous deployments do not carry over.

---

## B. Protocol Fees — IMPLEMENTED AND DEPLOYED

**What:** Added `protocol_admin`, `protocol_fee_recipient`, and `protocol_fee_bps` storage (set at construction: the deployer becomes `protocol_admin` and the initial `fee_recipient`, `fee_bps` starts at `0`). Added `set_protocol_fee(recipient, fee_bps)` (only callable by `protocol_admin`, capped at `MAX_PROTOCOL_FEE_BPS = 1000` i.e. 10%) and a `get_protocol_fee_info()` view. `claim_settlement` now computes `fee_amount = funded * fee_bps // 10000`, transfers it to `fee_recipient`, and splits the *remaining* escrow between the parties by the verdict's bps split. When `fee_bps == 0` (the default) behavior is identical to before.

**Why existing methods were not enough:** `claim_settlement` distributed 100% of escrowed funds to the two parties with no fee deduction logic and no treasury concept at all.

**Requires redeploy:** Already redeployed in the current StudioNet address.

**State impact:** Fees only apply to cases opened on a deployment that includes the fee logic. The fee defaults to `0` bps until the protocol admin explicitly calls `set_protocol_fee`.

---

## C. Richer Settlement Modes

**What:** Support additional settlement structures beyond the current 2-party basis-point split:
- **Milestone-based settlement:** Release funds as milestones are verified.
- **Time-locked release:** Hold funds for a specified period after verdict before release.
- **Multi-party splits:** Distribute among more than 2 parties (e.g. complainant, respondent, and a mediator).

**Why existing methods are not enough:** The current verdict structure uses `complainant_bps` and `respondent_bps` which must sum to 10000. There is no concept of milestones, time locks, or additional parties.

**Requires redeploy:** Yes. Changes needed:
- New data structures for milestone definitions and multi-party payee lists.
- Modified `Verdict` schema to support multi-party splits.
- New methods like `release_milestone(case_id, milestone_index)`.
- Template schema changes to define milestone structures.

**State impact:** New deployment with an incompatible template schema. Existing templates and cases on the old contract are not affected but cannot use the new features.

---

## D. App Permissions / Roles — IMPLEMENTED AND DEPLOYED

**What:** Added app-scoped roles, `admin` and `moderator` (the app's own `owner` is a separate, implicit role and is never stored in this map). Storage is a flat `app_roles: TreeMap[str, str]` keyed by `"{app_id}:{address_hex}" -> role`, plus an append-only `role_holder_keys: DynArray[str]` log used purely for enumeration (GenLayer's `TreeMap` has no key iteration, so `get_app_roles` walks the log and cross-references current role, skipping revoked entries). New methods: `grant_role(app_id, address, role)`, `revoke_role(app_id, address)` (owner-only), and `get_app_roles(app_id)` (view). `close_evidence` now also accepts a call from an address with `admin` or `moderator` role on that app, in addition to the existing case-party / app-owner / post-deadline-anyone paths. `request_verdict` already had no sender restriction, so moderators (and everyone else) could already call it — documented in place, no code change needed there. Per the spec, moderators still cannot call `claim_settlement` (no permission check was added there) or change app ownership (there is no "transfer ownership" method at all yet, implemented or otherwise).

**Why existing methods were not enough:** The contract only tracked `app.owner` as the sole per-app authority, with no delegation mechanism for teams that want to split evidence/verdict operations across multiple people without sharing the owner key.

**Requires redeploy:** Already redeployed in the current StudioNet address.

**State impact:** Roles are scoped to apps registered on the current deployment. Apps on older deployments must be re-registered here before their owners can grant roles.

---

## E. Event Indexing / Metadata

**What:** Emit on-chain events for key state transitions:
- `CaseOpened(case_id, app_id, complainant, respondent)`
- `EvidenceSubmitted(case_id, evidence_id, submitted_by)`
- `VerdictIssued(case_id, verdict_category, winner)`
- `AppealFiled(case_id, appeal_id, filed_by)`
- `CaseFinalized(case_id)`
- `SettlementClaimed(case_id, claimant, amount)`

**Why existing methods are not enough:** The current contract stores state but does not emit events. Integrators must poll `get_all_cases` or `get_case` to detect changes, which is inefficient and does not scale.

**Requires redeploy:** Yes, and it also depends on GenVM support for events. GenLayer's GenVM may not currently support Ethereum-style event emission from Intelligent Contracts. This change is blocked until GenVM adds that capability.

**State impact:** New deployment. Historical events from the old contract would not be available unless a migration script reads old state and emits synthetic events.

---

## Needs backend/off-chain service

Nothing in the implemented round required an off-chain service — Manual Review Resolver, Roles, and Protocol Fees are pure contract + frontend changes. Two ideas from the broader roadmap remain genuinely blocked on infrastructure DisputeOS doesn't have:

- **Event Indexing (§E above):** blocked on GenVM event-emission support, not on anything DisputeOS could add itself. A workaround (an off-chain indexer that polls `get_all_cases`/`get_case` on a schedule and diffs state) is possible but is an off-chain service, not a contract change.
- **Hosted/managed DisputeOS** (see `FUTURE_IMPLEMENTATIONS.md`): API keys, webhook callbacks, and a managed dashboard inherently require an off-chain backend (a database, a webhook dispatcher, auth) — this cannot be done with contract + frontend changes alone.

---

## Deployment Notes

The current deployment address is:

```
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE
```

For a future redeploy:

```bash
genlayer deploy --contract contract/disputeos_protocol.py --rpc https://studio.genlayer.com/api
```

Then update `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` in `.env.local` to the new address. The frontend already has the UI wired up (Manual Review Panel on the verdict page, Roles panel on the app page, Protocol Fee admin page at `/admin/protocol`).

**What is lost on redeploy:** every app, template, case, evidence item, verdict, and appeal currently stored on the previous address — a new contract address is a new, empty storage instance. There is no migration path for existing on-chain state; this is inherent to how GenLayer Intelligent Contracts work, not something this change introduces.

Deploy deliberately and retest the full lifecycle from scratch after every redeploy.
