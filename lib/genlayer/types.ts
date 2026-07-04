// Mirrors the on-chain structures defined in contract/disputeos_protocol.py.
// This is the reusable Dispute Packet data model — the same shapes any
// integrated app would see when it calls DisputeOSProtocol.

export type CaseStatus =
  | "template_created"
  | "case_opened"
  | "case_funded"
  | "respondent_notified"
  | "evidence_open"
  | "evidence_closed"
  | "under_validator_review"
  | "verdict_issued"
  | "appeal_window_open"
  | "appeal_under_review"
  | "finalized"
  | "settled"
  | "cancelled"
  | "expired"
  | "insufficient_evidence"
  | "manual_review_required"
  | "unverifiable"
  | "settlement_failed";

export type VerdictCategory =
  | "complainant_wins"
  | "respondent_wins"
  | "split_settlement"
  | "partial_refund"
  | "redo_required"
  | "no_fault"
  | "insufficient_evidence"
  | "unverifiable"
  | "manual_review_required"
  | "appeal_granted"
  | "appeal_rejected";

export type Winner = "complainant" | "respondent" | "split" | "none";

export type EvidenceAlignment = "none" | "weak" | "moderate" | "strong" | "decisive";

export type RuleFit = "none" | "weak" | "partial" | "strong" | "exact";

export type SettlementMode =
  | "escrow_release"
  | "refund"
  | "split_payment"
  | "non_monetary_verdict"
  | "external_settlement_instruction";

export type AppealBasis =
  | "new_evidence"
  | "wrong_rule_interpretation"
  | "evidence_misread"
  | "timeline_misread"
  | "settlement_disproportionate"
  | "identity_or_party_error";

export type AppealStatus = "filed" | "under_review" | "resolved";

export interface RegisteredApp {
  app_id: number;
  owner: string;
  name: string;
  domain: string;
  description: string;
  active: boolean;
  created_at: number;
}

export interface DisputeTemplate {
  template_id: number;
  app_id: number;
  name: string;
  case_type: string;
  rules: string;
  required_evidence: string;
  allowed_verdicts: VerdictCategory[];
  settlement_mode: SettlementMode;
  appeal_enabled: boolean;
  appeal_window: number;
  public_visibility: boolean;
}

export interface DisputeCase {
  case_id: number;
  app_id: number;
  template_id: number;
  complainant: string;
  respondent: string;
  case_summary: string;
  requested_remedy: string;
  respondent_response: string;
  settlement_amount: string;
  status: CaseStatus;
  created_at: number;
  evidence_deadline: number;
  verdict_finalized: boolean;
  payout_claimed: boolean;
}

export interface EvidenceItem {
  evidence_id: number;
  case_id: number;
  submitted_by: string;
  evidence_type: string;
  title: string;
  statement: string;
  public_url: string;
  submitted_at: number;
}

export interface Verdict {
  case_id: number;
  verdict: VerdictCategory;
  winner: Winner;
  complainant_bps: number;
  respondent_bps: number;
  confidence: number;
  evidence_alignment: EvidenceAlignment;
  rule_fit: RuleFit;
  appeal_allowed: boolean;
  reason_code: string;
  short_reason: string;
  issued_at: number;
}

export interface Appeal {
  appeal_id: number;
  case_id: number;
  filed_by: string;
  basis: AppealBasis;
  statement: string;
  evidence_urls: string[];
  status: AppealStatus;
  result: string;
  created_at: number;
}

export const ALLOWED_VERDICTS: VerdictCategory[] = [
  "complainant_wins",
  "respondent_wins",
  "split_settlement",
  "partial_refund",
  "redo_required",
  "no_fault",
  "insufficient_evidence",
  "unverifiable",
  "manual_review_required",
];

export const APPEAL_BASES: AppealBasis[] = [
  "new_evidence",
  "wrong_rule_interpretation",
  "evidence_misread",
  "timeline_misread",
  "settlement_disproportionate",
  "identity_or_party_error",
];

export const SETTLEMENT_MODES: SettlementMode[] = [
  "escrow_release",
  "refund",
  "split_payment",
  "non_monetary_verdict",
  "external_settlement_instruction",
];

export type AppRole = "owner" | "admin" | "moderator";

export interface AppRoleGrant {
  address: string;
  role: Exclude<AppRole, "owner">;
}

export interface ProtocolFeeInfo {
  admin: string;
  fee_recipient: string;
  fee_bps: number;
}
