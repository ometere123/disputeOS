import type { CaseStatus, VerdictCategory, DisputeCase, Verdict } from "./types";

/** Convert wei (bigint or string) to a human-readable GEN string. */
export function formatGEN(wei: bigint | string): string {
  const value = typeof wei === "string" ? BigInt(wei) : wei;
  const whole = value / BigInt(1e18);
  const frac = value % BigInt(1e18);
  if (frac === BigInt(0)) return `${whole} GEN`;
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fracStr} GEN`;
}

/** Parse a GEN amount (number or string) to wei as bigint. */
export function parseGEN(gen: number | string): bigint {
  const n = typeof gen === "string" ? parseFloat(gen) : gen;
  return BigInt(Math.floor(n * 1e18));
}

/** Format basis points as a percentage string. */
export function formatBps(bps: number): string {
  return `${bps / 100}%`;
}

/** Shorten an address to "0xABCD...1234" form. */
export function formatAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  template_created: "Template Created",
  case_opened: "Case Opened",
  case_funded: "Case Funded",
  respondent_notified: "Respondent Notified",
  evidence_open: "Evidence Open",
  evidence_closed: "Evidence Closed",
  under_validator_review: "Under Validator Review",
  verdict_issued: "Verdict Issued",
  appeal_window_open: "Appeal Window Open",
  appeal_under_review: "Appeal Under Review",
  finalized: "Finalized",
  settled: "Settled",
  cancelled: "Cancelled",
  expired: "Expired",
  insufficient_evidence: "Insufficient Evidence",
  manual_review_required: "Manual Review Required",
  unverifiable: "Unverifiable",
  settlement_failed: "Settlement Failed",
};

/** Human-readable label for a case status. */
export function statusLabel(status: CaseStatus): string {
  return STATUS_LABELS[status] ?? status;
}

const VERDICT_LABELS: Record<VerdictCategory, string> = {
  complainant_wins: "Complainant Wins",
  respondent_wins: "Respondent Wins",
  split_settlement: "Split Settlement",
  partial_refund: "Partial Refund",
  redo_required: "Redo Required",
  no_fault: "No Fault",
  insufficient_evidence: "Insufficient Evidence",
  unverifiable: "Unverifiable",
  manual_review_required: "Manual Review Required",
  appeal_granted: "Appeal Granted",
  appeal_rejected: "Appeal Rejected",
};

/** Human-readable label for a verdict category. */
export function verdictLabel(verdict: VerdictCategory): string {
  return VERDICT_LABELS[verdict] ?? verdict;
}

const TERMINAL_STATUSES: Set<CaseStatus> = new Set([
  "settled",
  "cancelled",
  "expired",
]);

/** Whether the case status is terminal (no further actions possible). */
export function isTerminal(status: CaseStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Whether evidence can still be submitted for this case. */
export function canSubmitEvidence(disputeCase: DisputeCase): boolean {
  return disputeCase.status === "evidence_open";
}

/** Whether a verdict can be requested for this case. */
export function canRequestVerdict(disputeCase: DisputeCase): boolean {
  return disputeCase.status === "evidence_closed";
}

/** Whether the case verdict can be appealed. */
export function canAppeal(
  disputeCase: DisputeCase,
  verdict: Verdict | null,
): boolean {
  return (
    disputeCase.status === "appeal_window_open" &&
    verdict !== null &&
    verdict.appeal_allowed
  );
}

/** Whether the case can be finalized. */
export function canFinalize(disputeCase: DisputeCase): boolean {
  return (
    disputeCase.status === "verdict_issued" ||
    disputeCase.status === "appeal_window_open"
  );
}

/** Whether the settlement can be claimed. */
export function canClaimSettlement(disputeCase: DisputeCase): boolean {
  return disputeCase.status === "finalized" && !disputeCase.payout_claimed;
}
