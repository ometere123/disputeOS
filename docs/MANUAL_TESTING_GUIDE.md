# DisputeOS Manual Testing Guide

Step-by-step checklist for verifying the full DisputeOS dispute lifecycle through the reference console.

---

## Prerequisites

- **Node.js** 18+ and **npm** installed
- Clone the repo and run `npm install`
- Create `.env.local` in the project root:
  ```env
  NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE
  NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
  NEXT_PUBLIC_CHAIN_ID=61999
  ```
- Start the dev server: `npm run dev`
- Open `http://localhost:3000`

### Wallet Setup

1. Click the wallet button in the header.
2. Choose **"Use Browser Session"** to generate a local StudioNet keypair.
3. Fund the wallet by calling `sim_fundAccount` via the RPC (see Integration Guide, Section 6).
4. Confirm the balance appears on the `/profile` page (may show 0.00 GEN -- this is normal if the balance endpoint is slow; transactions still work).

---

## Test Flow

### Step 1: Register App

**Route:** `/apps/register`

**Form values:**
| Field | Value |
|-------|-------|
| App Name | `BuildMarket` |
| Domain | `buildmarket.io` |
| Description | `Freelance marketplace for builders and contractors` |

**Submit** and wait for the transaction to be accepted (status badge turns green).

**Success:** Redirects to `/apps` or shows confirmation. The app appears in the app list at `/apps`.

**Errors to watch for:**
- "Server busy" -- retry after 5 seconds
- "Connect a StudioNet wallet" -- connect wallet first

---

### Step 2: Create Template

**Route:** `/apps/[appId]/templates/create` (click into your app first, then "Create Template")

**Form values:**
| Field | Value |
|-------|-------|
| Template Name | `Freelance Delivery Dispute` |
| Case Type | `delivery` |
| Rules | `Deliverables must match the agreed scope. Partial delivery counts as partial fault. Late delivery past the agreed deadline is grounds for partial refund.` |
| Required Evidence | `Screenshots of deliverables, chat logs, contract/agreement documents, file links showing deliverable status` |
| Allowed Verdicts | Select all: complainant_wins, respondent_wins, split_settlement, partial_refund, redo_required, no_fault, insufficient_evidence, unverifiable, manual_review_required |
| Settlement Mode | `escrow_release` |
| Appeal Enabled | Checked (true) |
| Appeal Window | `86400` (1 day in seconds) |
| Public Visibility | Checked (true) |

**Success:** Template appears in the app's template list.

---

### Step 3: Open Case

**Route:** `/cases/open`

**Form values:**
| Field | Value |
|-------|-------|
| App | Select `BuildMarket` |
| Template | Select `Freelance Delivery Dispute` |
| Respondent Address | A second wallet address (generate one at `/profile` in an incognito window, or use any valid `0x...` address) |
| Case Summary | `Freelancer was contracted to deliver 5 milestones for a website redesign. Only milestones 1 and 2 were completed. Milestone 3 was partially done. Milestones 4 and 5 were never started.` |
| Requested Remedy | `Full refund of escrowed funds (100 GEN)` |
| Evidence Deadline | A date 7 days in the future |

**Success:** Case appears at `/cases` with status `case_opened`.

---

### Step 4: Fund Case

**Route:** `/cases/[caseId]` (the case detail page)

**Action:** Click "Fund Case" and enter `100` GEN.

**Success:** Case status changes to `case_funded`, then `evidence_open`.

**Errors to watch for:**
- If your wallet has insufficient GEN, fund it via `sim_fundAccount` first.

---

### Step 5: Submit Complainant Evidence

**Route:** `/cases/[caseId]/evidence`

**Form values:**
| Field | Value |
|-------|-------|
| Evidence Type | `screenshot` |
| Title | `Milestone checklist showing incomplete delivery` |
| Statement | `The attached screenshot shows the project tracker. Milestones 1 and 2 are marked complete. Milestone 3 is at 40%. Milestones 4 and 5 have no progress.` |
| Public URL | `https://example.com/evidence/milestone-tracker.png` |

**Success:** Evidence item appears in the evidence list for this case.

---

### Step 6: Submit Respondent Evidence

**Action:** Switch to the respondent's wallet (open incognito window, connect with respondent's private key) and navigate to `/cases/[caseId]/evidence`.

**Form values:**
| Field | Value |
|-------|-------|
| Evidence Type | `document` |
| Title | `Revised timeline agreement` |
| Statement | `The client agreed via email on March 15 to extend the deadline for milestones 3-5 by 2 weeks. The deadline has not yet passed under the revised agreement.` |
| Public URL | `https://example.com/evidence/email-thread.pdf` |

**Success:** Second evidence item appears in the list.

---

### Step 7: Close Evidence

**Route:** `/cases/[caseId]` (case detail page, as the complainant/case opener)

**Action:** Click "Close Evidence".

**Success:** Case status changes to `evidence_closed`.

---

### Step 8: Request Verdict

**Route:** `/cases/[caseId]/verdict`

**Action:** Click "Request Verdict".

**Important:** This triggers the GenLayer LLM consensus mechanism. It takes **30-60 seconds** for validators to process the case. The page should show a loading/pending state.

**Success:** Case status changes to `verdict_issued` (or `manual_review_required` if the LLM output was malformed).

**Errors to watch for:**
- "Server busy" or "all 8 execution slots occupied" -- retry after a few seconds
- Long wait times (>2 minutes) -- the chain may be under heavy load; check the explorer

---

### Step 9: Check Verdict Result

**Route:** `/cases/[caseId]/verdict`

**Expected:** The verdict page displays:
- **Verdict category:** one of the allowed verdicts (e.g. `complainant_wins`, `split_settlement`)
- **Winner:** `complainant`, `respondent`, `split`, or `none`
- **Basis points split:** e.g. `complainant_bps: 7000, respondent_bps: 3000`
- **Confidence score**
- **Evidence alignment:** `none` through `decisive`
- **Rule fit:** `none` through `exact`
- **Short reason:** a human-readable one-line explanation

If the verdict is `manual_review_required`, this means the LLM output could not be parsed as valid JSON. This is the contract's fallback behavior, not a bug.

---

### Step 10: File Appeal (Optional)

**Route:** `/cases/[caseId]/appeal`

**Prerequisite:** Case status must be `appeal_window_open` and the template must have `appeal_enabled: true`.

**Form values:**
| Field | Value |
|-------|-------|
| Basis | `new_evidence` |
| Statement | `New chat logs discovered after evidence closed show that milestone 3 was actually completed and delivered via a different file-sharing link.` |
| Evidence URLs | `https://example.com/new-chat-logs.png` |

**Success:** Appeal appears on the appeal page with status `filed`.

---

### Step 11: Request Appeal Review (Optional)

**Route:** `/cases/[caseId]/appeal`

**Action:** Click "Request Appeal Review".

**Important:** Like the initial verdict, this triggers LLM consensus and takes 30-60 seconds.

**Success:** Appeal status changes to `resolved`. The case may have an updated verdict.

---

### Step 12: Finalize Case

**Route:** `/cases/[caseId]`

**Prerequisite:** Case status must be `verdict_issued` or `appeal_window_open`.

**Action:** Click "Finalize Case".

**Success:** Case status changes to `finalized`.

---

### Step 13: Claim Settlement

**Route:** `/cases/[caseId]`

**Prerequisite:** Case status must be `finalized` and `payout_claimed` must be `false`.

**Action:** Click "Claim Settlement".

**Success:** Case status changes to `settled`. The `payout_claimed` flag becomes `true`.

---

## Known Behaviors

| Behavior | Explanation |
|----------|-------------|
| "all 8 execution slots occupied" | StudioNet has limited capacity. Retry in 5-10 seconds. |
| Verdict is `manual_review_required` | The LLM consensus produced invalid JSON. The contract falls back to this verdict category. It is intentional, not a bug. |
| Balance shows `0.00 GEN` | StudioNet does not charge gas. Transactions still succeed. Use `sim_fundAccount` to get GEN for escrow deposits. |
| Transaction stuck on "pending" | The receipt poller timed out. Check `https://explorer-studio.genlayer.com/tx/{hash}` to see if the chain accepted it. |
| Verdict takes 30-60 seconds | Normal. The GenVM runs LLM consensus across multiple validators. |
| Appeal review takes 30-60 seconds | Same as above -- LLM consensus for appeal review. |
