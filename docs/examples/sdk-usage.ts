/**
 * DisputeOS — SDK Integration Example
 *
 * Same lifecycle as direct-contract.ts, but using the typed DisputeOS SDK.
 * Compare the two to see how much boilerplate the SDK removes.
 *
 * Prerequisites:
 *   npm install genlayer-js
 *
 * Run:
 *   npx tsx docs/examples/sdk-usage.ts
 */

import { createAccount, generatePrivateKey } from "genlayer-js";
import { DisputeOS, formatGEN, statusLabel, verdictLabel } from "../../packages/sdk/src";

const CONTRACT = "0x0dB7DbFdCd407c18381E0b91244dB956944c0dBE";

async function fundWallet(address: string, amountWei: number) {
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

async function main() {
  // Create two accounts
  const complainant = createAccount(generatePrivateKey());
  const respondent = createAccount(generatePrivateKey());

  console.log(`Complainant: ${complainant.address}`);
  console.log(`Respondent:  ${respondent.address}`);

  // Fund wallets
  await fundWallet(complainant.address, 1000 * 1e18);
  await fundWallet(respondent.address, 1000 * 1e18);
  await new Promise((r) => setTimeout(r, 3000));

  // SDK client for complainant
  const dos = new DisputeOS({ contractAddress: CONTRACT, account: complainant });
  // SDK client for respondent
  const dosR = new DisputeOS({ contractAddress: CONTRACT, account: respondent });

  // 1. Register app
  console.log("\n1. Registering app...");
  await dos.registerApp({
    name: "BuildMarket",
    domain: "buildmarket.io",
    description: "Freelance marketplace for builders",
  });
  const apps = await dos.getAllApps();
  const appId = apps[apps.length - 1].app_id;
  console.log(`   App id=${appId}`);

  // 2. Create template
  console.log("\n2. Creating template...");
  await dos.createTemplate({
    appId,
    name: "Freelance Delivery Dispute",
    caseType: "delivery",
    rules: "Deliverables must match the agreed scope. Partial delivery is partial fault.",
    requiredEvidence: "Screenshots, chat logs, or file links",
    allowedVerdicts: [
      "complainant_wins", "respondent_wins", "split_settlement", "partial_refund",
      "redo_required", "no_fault", "insufficient_evidence", "unverifiable",
      "manual_review_required",
    ],
    settlementMode: "escrow_release",
    appealEnabled: true,
    appealWindow: 86400,
    publicVisibility: true,
  });
  const templates = await dos.getAppTemplates(appId);
  const templateId = templates[templates.length - 1].template_id;
  console.log(`   Template id=${templateId}`);

  // 3. Open case
  console.log("\n3. Opening case...");
  await dos.openCase({
    appId,
    templateId,
    respondent: respondent.address,
    caseSummary: "Freelancer delivered only 2 of 5 milestones.",
    requestedRemedy: "Full refund of escrowed funds",
    evidenceDeadline: Math.floor(Date.now() / 1000) + 7 * 86400,
  });
  const allCases = await dos.getAllCases();
  const caseId = allCases[allCases.length - 1].case_id;
  console.log(`   Case id=${caseId}`);

  // 4. Fund case — SDK handles GEN-to-wei conversion
  console.log("\n4. Funding case with 100 GEN...");
  await dos.fundCase({ caseId, amountGEN: 100 });

  // 5. Complainant evidence
  console.log("\n5. Submitting complainant evidence...");
  await dos.submitEvidence({
    caseId,
    evidenceType: "screenshot",
    title: "Milestone checklist",
    statement: "Only milestones 1 and 2 completed.",
    publicUrl: "https://example.com/evidence/checklist.png",
  });

  // 6. Respondent evidence (using respondent's SDK instance)
  console.log("\n6. Submitting respondent evidence...");
  await dosR.submitEvidence({
    caseId,
    evidenceType: "document",
    title: "Revised timeline",
    statement: "Client agreed to a 2-week extension.",
    publicUrl: "https://example.com/evidence/email.pdf",
  });

  // 7. Close evidence
  console.log("\n7. Closing evidence...");
  await dos.closeEvidence({ caseId });

  // 8. Request verdict (30-60s for LLM consensus)
  console.log("\n8. Requesting verdict...");
  await dos.requestVerdict({ caseId });

  // 9. Read verdict
  const verdict = await dos.getCaseVerdict(caseId);
  if (verdict) {
    console.log(`\n9. Verdict: ${verdictLabel(verdict.verdict)}`);
    console.log(`   Winner: ${verdict.winner}`);
    console.log(`   Split: ${verdict.complainant_bps}bps / ${verdict.respondent_bps}bps`);
    console.log(`   Reason: ${verdict.short_reason}`);
  }

  // 10. Finalize
  console.log("\n10. Finalizing...");
  await dos.finalizeCase({ caseId });

  // 11. Claim settlement
  console.log("\n11. Claiming settlement...");
  await dos.claimSettlement({ caseId });

  // Final state
  const finalCase = await dos.getCase(caseId);
  console.log(`\nFinal status: ${statusLabel(finalCase.status)}`);
  console.log(`Settlement amount: ${formatGEN(finalCase.settlement_amount)}`);
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
