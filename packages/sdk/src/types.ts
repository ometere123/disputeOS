// Re-export all contract types from the shared type definitions.
export type {
  CaseStatus,
  VerdictCategory,
  Winner,
  EvidenceAlignment,
  RuleFit,
  SettlementMode,
  AppealBasis,
  AppealStatus,
  RegisteredApp,
  DisputeTemplate,
  DisputeCase,
  EvidenceItem,
  Verdict,
  Appeal,
} from "../../../lib/genlayer/types";

export {
  ALLOWED_VERDICTS,
  APPEAL_BASES,
  SETTLEMENT_MODES,
} from "../../../lib/genlayer/types";

// SDK-specific types

export interface DisputeOSConfig {
  contractAddress: string;
  chain?: unknown;
  rpcUrl?: string;
  account?: unknown;
}

export interface WriteResult {
  txHash: string;
  receipt: unknown;
}
