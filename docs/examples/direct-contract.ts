/**
 * DisputeOS — Direct Contract Integration Example
 *
 * Demonstrates the full dispute lifecycle using raw genlayer-js calls.
 *
 * Prerequisites:
 *   npm install genlayer-js
 *
 * Run:
 *   npx tsx docs/examples/direct-contract.ts
 */

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT = "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE" as `0x${string}`;

// ---------- helpers ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeAndWait(client: any, functionName: string, args: unknown[], value?: bigint) {
  console.log(`  -> ${functionName}(${JSON.stringify(args).slice(1, -1)})`);
  const hash = await client.writeContract({
    address: CONTRACT,
    functionName,
    args,
    ...(value !== undefined ? { value } : {}),
  });
  console.log(`     tx: ${hash}`);
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: "ACCEPTED",
    retries: 60,
    interval: 3000,
  });
  console.log(`     accepted`);
  return { hash, receipt };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function read(client: any, functionName: string, args: unknown[] = []) {
  return client.readContract({ address: CONTRACT, functionName, args });
}

async function fundWallet(address: string, amountWei: number) {
  console.log(`  Funding ${address} with ${amountWei / 1e18} GEN...`);
  await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "sim_fundAccount",
      params: [address, amountWei],
      id: 1,
    }),
  });
}

// ---------- main ----------

async function main() {
  // Create two wallets: complainant and respondent
  const complainantKey = generatePrivateKey();
  const respondentKey = generatePrivateKey();
  const complainant = createAccount(complainantKey);
  const respondent = createAccount(respondentKey);

  const clientC = createClient({ chain: studionet, account: complainant });
  const clientR = createClient({ chain: studionet, account: respondent });

  console.log(`Complainant: ${complainant.address}`);
  console.log(`Respondent:  ${respondent.address}`);

  // Fund wallets on StudioNet
  await fundWallet(complainant.address, 1000 * 1e18);
  await fundWallet(respondent.address, 1000 * 1e18);
  // Allow time for funding to propagate
  await new Promise((r) => setTimeout(r, 3000));

  // Step 1: Register an app
  console.log("\n1. Registering app...");
  await writeAndWait(clientC, "register_app", [
    "BuildMarket",
    "buildmarket.io",
    "Freelance marketplace for builders",
  ]);

  // Read back the app list to find our app_id
  const apps = await read(clientC, "get_all_apps");
  const app = apps[apps.length - 1];
  const appId = app.app_id;
  console.log(`   App registered with id=${appId}`);

  // Step 2: Create a dispute template
  console.log("\n2. Creating dispute template...");
  await writeAndWait(clientC, "create_template", [
    appId,
    "Freelance Delivery Dispute",
    "delivery",
    "Deliverables must match the agreed scope. Partial delivery is partial fault.",
    "Screenshots, chat logs, or file links showing deliverable status",
    [
      "complainant_wins",
      "respondent_wins",
      "split_settlement",
      "partial_refund",
      "redo_required",
      "no_fault",
      "insufficient_evidence",
      "unverifiable",
      "manual_review_required",
    ],
    "escrow_release",
    true,   // appeal_enabled
    86400,  // appeal_window (1 day)
    true,   // public_visibility
  ]);

  const templates = await read(clientC, "get_app_templates", [appId]);
  const templateId = templates[templates.length - 1].template_id;
  console.log(`   Template created with id=${templateId}`);

  // Step 3: Open a case
  console.log("\n3. Opening case...");
  const deadline = Math.floor(Date.now() / 1000) + 7 * 86400;
  await writeAndWait(clientC, "open_case", [
    appId,
    templateId,
    respondent.address,
    "Freelancer delivered only 2 of 5 milestones for a website redesign project.",
    "Full refund of escrowed funds",
    deadline,
  ]);

  const cases = await read(clientC, "get_all_cases");
  const caseId = cases[cases.length - 1].case_id;
  console.log(`   Case opened with id=${caseId}`);

  // Step 4: Fund the case (100 GEN)
  console.log("\n4. Funding case with 100 GEN...");
  await writeAndWait(clientC, "fund_case", [caseId], BigInt(100) * BigInt(1e18));

  // Step 5: Submit complainant evidence
  console.log("\n5. Submitting complainant evidence...");
  await writeAndWait(clientC, "submit_evidence", [
    caseId,
    "screenshot",
    "Milestone checklist screenshot",
    "Only milestones 1 and 2 are marked complete. Milestone 3 is at 40%.",
    "https://example.com/evidence/checklist.png",
  ]);

  // Step 6: Submit respondent evidence
  console.log("\n6. Submitting respondent evidence...");
  await writeAndWait(clientR, "submit_evidence", [
    caseId,
    "document",
    "Revised timeline agreement",
    "The client agreed to extend the deadline by 2 weeks. The deadline has not passed.",
    "https://example.com/evidence/email-thread.pdf",
  ]);

  // Step 7: Close evidence
  console.log("\n7. Closing evidence...");
  await writeAndWait(clientC, "close_evidence", [caseId]);

  // Step 8: Request verdict (LLM consensus — takes 30-60s)
  console.log("\n8. Requesting verdict (this will take 30-60 seconds)...");
  await writeAndWait(clientC, "request_verdict", [caseId]);

  // Step 9: Read the verdict
  console.log("\n9. Reading verdict...");
  const verdict = await read(clientC, "get_case_verdict", [caseId]);
  console.log(`   Verdict: ${verdict.verdict}`);
  console.log(`   Winner: ${verdict.winner}`);
  console.log(`   Split: complainant ${verdict.complainant_bps}bps / respondent ${verdict.respondent_bps}bps`);
  console.log(`   Confidence: ${verdict.confidence}`);
  console.log(`   Reason: ${verdict.short_reason}`);

  // Step 10: Finalize the case
  console.log("\n10. Finalizing case...");
  const caseData = await read(clientC, "get_case", [caseId]);
  if (caseData.status === "appeal_window_open" || caseData.status === "verdict_issued") {
    await writeAndWait(clientC, "finalize_case", [caseId]);
  } else {
    console.log(`   Skipping finalize — case status is ${caseData.status}`);
  }

  // Step 11: Claim settlement
  console.log("\n11. Claiming settlement...");
  const finalCase = await read(clientC, "get_case", [caseId]);
  if (finalCase.status === "finalized" && !finalCase.payout_claimed) {
    await writeAndWait(clientC, "claim_settlement", [caseId]);
  } else {
    console.log(`   Skipping claim — status=${finalCase.status}, payout_claimed=${finalCase.payout_claimed}`);
  }

  // Final state
  console.log("\n--- Final Case State ---");
  const result = await read(clientC, "get_case", [caseId]);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
