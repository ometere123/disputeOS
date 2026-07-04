/**
 * DisputeOS — Widget Integration Example
 *
 * Shows how to embed DisputeOS components in a Next.js app.
 * Not runnable standalone — copy into your Next.js project.
 */

"use client";

import React, { useState } from "react";

// In a real integration you would install @disputeos/widgets or copy
// the relevant files from the DisputeOS repo:
//   - lib/genlayer/wallet.tsx   → WalletProvider, useWallet
//   - lib/genlayer/hooks.ts     → useContractRead, useContractWrite
//   - lib/genlayer/contract.ts  → requireContractAddress
//
// For this example we import from the repo paths:
import { WalletProvider, useWallet } from "../../lib/genlayer/wallet";
import { useContractRead, useContractWrite } from "../../lib/genlayer/hooks";

// ---------- Layout wrapper ----------

/**
 * Wrap your app in WalletProvider at the layout level.
 * This provides wallet state to all child components.
 *
 * In app/layout.tsx:
 *
 *   import { WalletProvider } from "../../lib/genlayer/wallet";
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html><body>
 *         <WalletProvider>{children}</WalletProvider>
 *       </body></html>
 *     );
 *   }
 */

// ---------- Wallet Connect Button ----------

function WalletButton() {
  const { status, address, connect, connectBrowserSession, disconnect } =
    useWallet();

  if (status === "connected") {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <code>{address?.slice(0, 6)}...{address?.slice(-4)}</code>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={connect}>Connect Wallet</button>
      <button onClick={connectBrowserSession}>Browser Session</button>
    </div>
  );
}

// ---------- Case Status Widget ----------

function CaseStatusWidget({ caseId }: { caseId: number }) {
  const { data: disputeCase, loading, error, refetch } = useContractRead<{
    case_id: number;
    status: string;
    complainant: string;
    respondent: string;
    case_summary: string;
    settlement_amount: string;
    payout_claimed: boolean;
  }>("get_case", [caseId]);

  if (loading) return <p>Loading case {caseId}...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!disputeCase) return <p>Case not found</p>;

  return (
    <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
      <h3>Case #{disputeCase.case_id}</h3>
      <p><strong>Status:</strong> {disputeCase.status}</p>
      <p><strong>Summary:</strong> {disputeCase.case_summary}</p>
      <p>
        <strong>Parties:</strong>{" "}
        {disputeCase.complainant.slice(0, 8)}... vs{" "}
        {disputeCase.respondent.slice(0, 8)}...
      </p>
      <button onClick={() => refetch(true)}>Refresh</button>
    </div>
  );
}

// ---------- Open Dispute Button ----------

function OpenDisputeButton({
  appId,
  templateId,
  respondent,
  onSuccess,
}: {
  appId: number;
  templateId: number;
  respondent: string;
  onSuccess?: () => void;
}) {
  const { write, status, error } = useContractWrite("open_case");
  const [summary, setSummary] = useState("");
  const [remedy, setRemedy] = useState("");

  const handleSubmit = async () => {
    const deadline = Math.floor(Date.now() / 1000) + 7 * 86400;
    await write([appId, templateId, respondent, summary, remedy, deadline]);
    onSuccess?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
      <textarea
        placeholder="Describe the dispute..."
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
      />
      <input
        placeholder="Requested remedy"
        value={remedy}
        onChange={(e) => setRemedy(e.target.value)}
      />
      <button onClick={handleSubmit} disabled={status === "pending" || !summary}>
        {status === "pending" ? "Submitting..." : "Open Dispute"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

// ---------- Evidence List ----------

function EvidenceList({ caseId }: { caseId: number }) {
  const { data: evidence, loading } = useContractRead<
    Array<{
      evidence_id: number;
      submitted_by: string;
      evidence_type: string;
      title: string;
      statement: string;
      public_url: string;
    }>
  >("get_case_evidence", [caseId]);

  if (loading) return <p>Loading evidence...</p>;
  if (!evidence || evidence.length === 0) return <p>No evidence submitted yet.</p>;

  return (
    <ul>
      {evidence.map((e) => (
        <li key={e.evidence_id}>
          <strong>{e.title}</strong> ({e.evidence_type}) by{" "}
          {e.submitted_by.slice(0, 8)}...
          <br />
          <em>{e.statement}</em>
          {e.public_url && (
            <>
              {" "}
              — <a href={e.public_url} target="_blank" rel="noreferrer">View</a>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------- Verdict Display ----------

function VerdictDisplay({ caseId }: { caseId: number }) {
  const { data: verdict, loading } = useContractRead<{
    verdict: string;
    winner: string;
    complainant_bps: number;
    respondent_bps: number;
    confidence: number;
    short_reason: string;
  } | null>("get_case_verdict", [caseId]);

  if (loading) return <p>Loading verdict...</p>;
  if (!verdict) return <p>No verdict issued yet.</p>;

  return (
    <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
      <h4>Verdict: {verdict.verdict}</h4>
      <p><strong>Winner:</strong> {verdict.winner}</p>
      <p>
        <strong>Split:</strong> Complainant {verdict.complainant_bps / 100}% /
        Respondent {verdict.respondent_bps / 100}%
      </p>
      <p><strong>Confidence:</strong> {verdict.confidence}%</p>
      <p><strong>Reason:</strong> {verdict.short_reason}</p>
    </div>
  );
}

// ---------- Example Page ----------

/**
 * Example page composing the widgets above.
 * Drop this into app/disputes/page.tsx in your Next.js app.
 */
export default function DisputesDemoPage() {
  return (
    <WalletProvider>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
        <h1>DisputeOS Integration Demo</h1>

        <section>
          <h2>Wallet</h2>
          <WalletButton />
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Case #1</h2>
          <CaseStatusWidget caseId={1} />
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Evidence</h2>
          <EvidenceList caseId={1} />
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Verdict</h2>
          <VerdictDisplay caseId={1} />
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Open a New Dispute</h2>
          <OpenDisputeButton
            appId={1}
            templateId={1}
            respondent="0x0000000000000000000000000000000000000000"
            onSuccess={() => alert("Dispute opened!")}
          />
        </section>
      </div>
    </WalletProvider>
  );
}
