# DisputeOS Integration Guide

DisputeOS is a reusable GenLayer Intelligent Contract for dispute resolution. Any application can integrate it to add structured, AI-adjudicated dispute handling without building its own arbitration logic.

**Contract address:** `0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE`
**Chain:** GenLayer StudioNet (chain ID 61999)
**RPC:** `https://studio.genlayer.com/api`

---

## Section 1: Direct Contract Integration

Use `genlayer-js` to call the DisputeOS contract directly. This is the lowest-level approach and works from any JavaScript/TypeScript environment.

### Setup

```bash
npm install genlayer-js
```

### Creating a Client

```typescript
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const account = createAccount("0xYOUR_PRIVATE_KEY");
const client = createClient({ chain: studionet, account });

const CONTRACT = "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE" as const;
```

### Full Lifecycle Example

```typescript
// 1. Register your app
const regHash = await client.writeContract({
  address: CONTRACT,
  functionName: "register_app",
  args: ["BuildMarket", "buildmarket.io", "Freelance marketplace"],
});
const regReceipt = await client.waitForTransactionReceipt({
  hash: regHash,
  status: "ACCEPTED",
  retries: 60,
  interval: 3000,
});

// 2. Create a dispute template
const tmplHash = await client.writeContract({
  address: CONTRACT,
  functionName: "create_template",
  args: [
    1,                          // app_id
    "Freelance Delivery Dispute",
    "delivery",
    "Deliverables must match the agreed scope. Partial delivery counts as partial fault.",
    "Screenshots, chat logs, or file links showing deliverable status",
    ["complainant_wins", "respondent_wins", "split_settlement", "partial_refund",
     "redo_required", "no_fault", "insufficient_evidence", "unverifiable", "manual_review_required"],
    "escrow_release",
    true,                       // appeal_enabled
    86400,                      // appeal_window (seconds)
    true,                       // public_visibility
  ],
});
await client.waitForTransactionReceipt({ hash: tmplHash, status: "ACCEPTED", retries: 60, interval: 3000 });

// 3. Open a case
const caseHash = await client.writeContract({
  address: CONTRACT,
  functionName: "open_case",
  args: [
    1,                                              // app_id
    1,                                              // template_id
    "0xRESPONDENT_ADDRESS",                         // respondent
    "Freelancer delivered only 2 of 5 milestones",  // case_summary
    "Full refund of escrowed funds",                // requested_remedy
    Math.floor(Date.now() / 1000) + 7 * 86400,     // evidence_deadline (7 days)
  ],
});
await client.waitForTransactionReceipt({ hash: caseHash, status: "ACCEPTED", retries: 60, interval: 3000 });

// 4. Fund the case (100 GEN)
const fundHash = await client.writeContract({
  address: CONTRACT,
  functionName: "fund_case",
  args: [1],  // case_id
  value: BigInt(100) * BigInt(1e18),
});
await client.waitForTransactionReceipt({ hash: fundHash, status: "ACCEPTED", retries: 60, interval: 3000 });

// 5. Submit complainant evidence
const evHash = await client.writeContract({
  address: CONTRACT,
  functionName: "submit_evidence",
  args: [
    1,                                    // case_id
    "screenshot",                         // evidence_type
    "Milestone checklist screenshot",     // title
    "Only milestones 1 and 2 were completed per the attached screenshot.", // statement
    "https://example.com/evidence/checklist.png",  // public_url
  ],
});
await client.waitForTransactionReceipt({ hash: evHash, status: "ACCEPTED", retries: 60, interval: 3000 });

// 6. Submit respondent evidence (from respondent's wallet)
// ... same pattern with respondent's client

// 7. Close evidence
await client.writeContract({
  address: CONTRACT,
  functionName: "close_evidence",
  args: [1],
});

// 8. Request verdict (triggers LLM consensus -- takes 30-60s)
const verdictHash = await client.writeContract({
  address: CONTRACT,
  functionName: "request_verdict",
  args: [1],
});
await client.waitForTransactionReceipt({
  hash: verdictHash,
  status: "ACCEPTED",
  retries: 60,
  interval: 3000,
});

// 9. Read the verdict
const verdict = await client.readContract({
  address: CONTRACT,
  functionName: "get_case_verdict",
  args: [1],
});
console.log(verdict);
// { verdict: "complainant_wins", winner: "complainant", complainant_bps: 10000, ... }

// 10. File appeal (optional)
await client.writeContract({
  address: CONTRACT,
  functionName: "file_appeal",
  args: [1, "new_evidence", "New chat logs show milestone 3 was delivered", ["https://example.com/chat.png"]],
});

// 11. Request appeal review (optional)
await client.writeContract({
  address: CONTRACT,
  functionName: "request_appeal_review",
  args: [1, 1],  // case_id, appeal_id
});

// 12. Finalize the case
await client.writeContract({
  address: CONTRACT,
  functionName: "finalize_case",
  args: [1],
});

// 13. Claim settlement
await client.writeContract({
  address: CONTRACT,
  functionName: "claim_settlement",
  args: [1],
});
```

### Read Method Examples

```typescript
// All registered apps
const apps = await client.readContract({
  address: CONTRACT,
  functionName: "get_all_apps",
  args: [],
});

// Single app
const app = await client.readContract({
  address: CONTRACT,
  functionName: "get_app",
  args: [1],
});

// Templates for an app
const templates = await client.readContract({
  address: CONTRACT,
  functionName: "get_app_templates",
  args: [1],
});

// Case details
const disputeCase = await client.readContract({
  address: CONTRACT,
  functionName: "get_case",
  args: [1],
});

// Evidence for a case
const evidence = await client.readContract({
  address: CONTRACT,
  functionName: "get_case_evidence",
  args: [1],
});

// Cases by party address
const myCases = await client.readContract({
  address: CONTRACT,
  functionName: "get_cases_by_party",
  args: ["0xYOUR_ADDRESS"],
});
```

### Error Handling Patterns

```typescript
async function writeWithRetry(
  client: any,
  params: any,
  maxRetries = 3,
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const hash = await client.writeContract(params);
      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: "ACCEPTED",
        retries: 60,
        interval: 3000,
      });
      return { hash, receipt };
    } catch (err: any) {
      const msg = err?.message ?? "";
      // StudioNet returns this when all execution slots are busy
      if (msg.includes("Server busy") || msg.includes("execution slots")) {
        console.warn(`Attempt ${attempt + 1} failed (server busy), retrying in 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}
```

---

## Section 2: SDK Integration

The `packages/sdk` module wraps all contract calls in a typed `DisputeOS` class with named parameters, automatic receipt polling, and GEN-to-wei conversion.

### Setup

```typescript
import { DisputeOS } from "@disputeos/sdk";
// Or from source:
// import { DisputeOS } from "../../packages/sdk/src";
import { createAccount } from "genlayer-js";

const account = createAccount("0xYOUR_PRIVATE_KEY");

const dos = new DisputeOS({
  contractAddress: "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE",
  account,
  // rpcUrl is optional; defaults to StudioNet
});
```

### Full Lifecycle

```typescript
// 1. Register app
await dos.registerApp({
  name: "BuildMarket",
  domain: "buildmarket.io",
  description: "Freelance marketplace",
});

// 2. Create template
await dos.createTemplate({
  appId: 1,
  name: "Freelance Delivery Dispute",
  caseType: "delivery",
  rules: "Deliverables must match the agreed scope.",
  requiredEvidence: "Screenshots, chat logs, or file links",
  allowedVerdicts: [
    "complainant_wins", "respondent_wins", "split_settlement",
    "partial_refund", "redo_required", "no_fault",
    "insufficient_evidence", "unverifiable", "manual_review_required",
  ],
  settlementMode: "escrow_release",
  appealEnabled: true,
  appealWindow: 86400,
  publicVisibility: true,
});

// 3. Open case
await dos.openCase({
  appId: 1,
  templateId: 1,
  respondent: "0xRESPONDENT",
  caseSummary: "Freelancer delivered only 2 of 5 milestones",
  requestedRemedy: "Full refund",
  evidenceDeadline: Math.floor(Date.now() / 1000) + 7 * 86400,
});

// 4. Fund case -- SDK handles GEN-to-wei conversion
await dos.fundCase({ caseId: 1, amountGEN: 100 });

// 5. Submit evidence
await dos.submitEvidence({
  caseId: 1,
  evidenceType: "screenshot",
  title: "Milestone checklist",
  statement: "Only milestones 1 and 2 were completed.",
  publicUrl: "https://example.com/evidence.png",
});

// 6. Close evidence
await dos.closeEvidence({ caseId: 1 });

// 7. Request verdict
await dos.requestVerdict({ caseId: 1 });

// 8. Read verdict
const verdict = await dos.getCaseVerdict(1);

// 9. Appeal (optional)
await dos.fileAppeal({
  caseId: 1,
  basis: "new_evidence",
  statement: "New chat logs show milestone 3 was delivered",
  evidenceUrls: ["https://example.com/chat.png"],
});
await dos.requestAppealReview({ caseId: 1, appealId: 1 });

// 10. Finalize and settle
await dos.finalizeCase({ caseId: 1 });
await dos.claimSettlement({ caseId: 1 });
```

### Helper Functions

```typescript
import { formatGEN, parseGEN, formatBps, statusLabel, verdictLabel, formatAddress } from "@disputeos/sdk";

formatGEN(BigInt(100e18));     // "100 GEN"
parseGEN(100);                  // 100000000000000000000n
formatBps(7500);                // "75%"
statusLabel("evidence_open");   // "Evidence Open"
verdictLabel("split_settlement"); // "Split Settlement"
formatAddress("0xAbCdEf1234567890AbCdEf1234567890AbCdEf12"); // "0xAbCd...Ef12"
```

### State-Check Helpers

```typescript
import { canSubmitEvidence, canRequestVerdict, canAppeal, canFinalize, canClaimSettlement, isTerminal } from "@disputeos/sdk";

const c = await dos.getCase(1);
const v = await dos.getCaseVerdict(1);

if (canSubmitEvidence(c))   { /* submit */ }
if (canRequestVerdict(c))   { /* request verdict */ }
if (canAppeal(c, v))        { /* file appeal */ }
if (canFinalize(c))         { /* finalize */ }
if (canClaimSettlement(c))  { /* claim */ }
if (isTerminal(c.status))   { /* done */ }
```

---

## Section 3: Widget Integration

DisputeOS ships React components that can be dropped into any Next.js app.

### Provider Setup

Wrap your app in the `WalletProvider` from `lib/genlayer/wallet`:

```tsx
// app/layout.tsx
import { WalletProvider } from "@disputeos/widgets";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
```

### Environment Variables

```env
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_CHAIN_ID=61999
```

### Using Hooks

```tsx
import { useContractRead, useContractWrite } from "@disputeos/widgets";

function CaseStatus({ caseId }: { caseId: number }) {
  const { data, loading, error, refetch } = useContractRead("get_case", [caseId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return <p>Status: {data?.status}</p>;
}

function FundButton({ caseId }: { caseId: number }) {
  const { write, status, error } = useContractWrite("fund_case");

  return (
    <button
      disabled={status === "pending"}
      onClick={() => write([caseId], BigInt(100) * BigInt(1e18))}
    >
      {status === "pending" ? "Funding..." : "Fund 100 GEN"}
    </button>
  );
}
```

### Wallet Connection

```tsx
import { useWallet } from "@disputeos/widgets";

function ConnectButton() {
  const { status, address, connect, connectBrowserSession, disconnect } = useWallet();

  if (status === "connected") {
    return (
      <div>
        <span>{address}</span>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={connect}>Connect Wallet (MetaMask)</button>
      <button onClick={connectBrowserSession}>Use Browser Session</button>
    </div>
  );
}
```

### Customization

The console components use Tailwind CSS. Override styles by:

1. Wrapping components in a container with custom Tailwind classes.
2. Using the `className` prop where supported.
3. Forking the component source from `components/dispute/` for deeper changes.

---

## Section 4: Reference Console

The DisputeOS console is a full Next.js application that demonstrates every contract interaction.

### Running Locally

```bash
git clone https://github.com/YOUR_ORG/disputeOS.git
cd disputeOS
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS in .env.local
npm run dev
```

### Route Reference

| Route | Purpose |
|-------|---------|
| `/` | Dashboard / landing page |
| `/apps` | List all registered apps |
| `/apps/register` | Register a new app |
| `/apps/[appId]` | App detail view |
| `/apps/[appId]/templates/create` | Create a dispute template for an app |
| `/cases` | List all dispute cases |
| `/cases/open` | Open a new dispute case |
| `/cases/[caseId]` | Case detail (status, parties, timeline) |
| `/cases/[caseId]/evidence` | Submit and view evidence |
| `/cases/[caseId]/verdict` | View verdict, request verdict |
| `/cases/[caseId]/appeal` | File or view appeals |
| `/profile` | Wallet info, balance, cases by party |

### Pointing at a Different Contract

Set `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` in `.env.local` to any deployed DisputeOSProtocol contract address. To use a different RPC endpoint, also set `NEXT_PUBLIC_GENLAYER_RPC_URL`.

---

## Section 5: External Settlement Mode

When a template's `settlement_mode` is set to `"external_settlement_instruction"`, the contract issues a verdict but does **not** move funds on-chain. Instead, your application reads the verdict and executes settlement through its own payment system.

### Template Setup

```typescript
await dos.createTemplate({
  appId: 1,
  name: "SaaS Subscription Dispute",
  caseType: "billing",
  rules: "Refund is due if the service was unavailable for >24h in the billing period.",
  requiredEvidence: "Uptime logs, support tickets, invoice",
  allowedVerdicts: [
    "complainant_wins", "respondent_wins", "partial_refund",
    "no_fault", "insufficient_evidence", "manual_review_required",
  ],
  settlementMode: "external_settlement_instruction",
  appealEnabled: true,
  appealWindow: 172800,
  publicVisibility: false,
});
```

### Reading the Verdict for External Settlement

```typescript
// Poll for verdict after requesting it
const verdict = await dos.getCaseVerdict(caseId);

if (!verdict) {
  console.log("Verdict not yet issued");
  return;
}

// Use the verdict to drive your own settlement
switch (verdict.verdict) {
  case "complainant_wins":
    // Full refund via Stripe
    await stripe.refunds.create({
      payment_intent: originalPaymentIntent,
      reason: "requested_by_customer",
    });
    break;

  case "partial_refund":
    // Partial refund based on complainant_bps
    const refundPercent = verdict.complainant_bps / 10000;
    await stripe.refunds.create({
      payment_intent: originalPaymentIntent,
      amount: Math.floor(originalAmount * refundPercent),
    });
    break;

  case "respondent_wins":
    // No refund -- notify customer
    await notifyCustomer(caseId, "Your dispute was resolved in favor of the vendor.");
    break;

  case "manual_review_required":
    // Escalate to human support
    await createSupportTicket(caseId, verdict.short_reason);
    break;
}

// Finalize the case on-chain after external settlement
await dos.finalizeCase({ caseId });
```

### Key Fields for External Settlement

| Field | Meaning |
|-------|---------|
| `verdict.verdict` | The verdict category (e.g. `complainant_wins`) |
| `verdict.winner` | `"complainant"`, `"respondent"`, `"split"`, or `"none"` |
| `verdict.complainant_bps` | Basis points (0-10000) allocated to complainant |
| `verdict.respondent_bps` | Basis points allocated to respondent |
| `verdict.confidence` | AI confidence score |
| `verdict.short_reason` | One-line human-readable explanation |
| `verdict.reason_code` | Machine-readable reason code |

---

## Section 6: Troubleshooting

### StudioNet "Server busy" Errors

**Symptom:** `writeContract` throws with a message containing "Server busy" or "all 8 execution slots occupied".

**Cause:** StudioNet has a limited number of execution slots for intelligent contract calls.

**Fix:** Retry with exponential backoff. See the `writeWithRetry` helper in Section 1.

### Transaction "pending" but Chain Accepted

**Symptom:** `waitForTransactionReceipt` hangs or the UI shows "pending" indefinitely.

**Cause:** The transaction was submitted but the receipt poll timed out. The transaction may still complete on-chain.

**Fix:** Increase `retries` (default 60) or `interval` (default 3000ms). You can also check the explorer at `https://explorer-studio.genlayer.com/tx/{hash}`.

### Wallet Connection Issues

**Symptom:** "No injected wallet found" error.

**Cause:** No EIP-1193 wallet extension (MetaMask, Rabby, etc.) is installed, or the page loaded before the extension injected `window.ethereum`.

**Fix:** Use the browser session mode (`connectBrowserSession`) which generates a local keypair and stores it in localStorage. This is recommended for StudioNet testing.

**Symptom:** Wallet connects but transactions fail with network errors.

**Cause:** The injected wallet is connected to a different chain (e.g. Ethereum mainnet).

**Fix:** StudioNet (chain ID 61999) must be added to the wallet manually. The console attempts auto-switching via `client.connect("studionet")` but some wallets do not support programmatic chain switching.

### Common Error Messages

| Error | Meaning | Action |
|-------|---------|--------|
| `"Server busy"` | StudioNet slots full | Retry in 5s |
| `"NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not set"` | Missing env var | Set it in `.env.local` |
| `"Connect a StudioNet wallet before sending a transaction"` | No wallet connected | Call `connect()` or `connectBrowserSession()` |
| `"Private key must be a 0x-prefixed 32-byte hex string"` | Bad key format in import | Provide valid 66-char hex key |
| `manual_review_required` verdict | LLM output was invalid JSON | Not an error; this is the contract's fallback verdict |

### Balance Shows 0.00 GEN

StudioNet does not charge gas, so a zero balance does not prevent transactions. To fund a test wallet for escrow deposits, use `sim_fundAccount` via the GenLayer Studio RPC:

```typescript
await fetch("https://studio.genlayer.com/api", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "sim_fundAccount",
    params: ["0xYOUR_ADDRESS", 1000000000000000000000], // 1000 GEN in wei
    id: 1,
  }),
});
```
