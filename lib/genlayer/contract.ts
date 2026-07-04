import { makeClient } from "./client";
import { CONTRACT_ADDRESS } from "./config";

export const DISPUTEOS_METHODS = {
  registerApp: "register_app",
  createTemplate: "create_template",
  openCase: "open_case",
  fundCase: "fund_case",
  respondToCase: "respond_to_case",
  submitEvidence: "submit_evidence",
  closeEvidence: "close_evidence",
  requestVerdict: "request_verdict",
  fileAppeal: "file_appeal",
  requestAppealReview: "request_appeal_review",
  finalizeCase: "finalize_case",
  claimSettlement: "claim_settlement",
  resolveManualReview: "resolve_manual_review",
  grantRole: "grant_role",
  revokeRole: "revoke_role",
  setProtocolFee: "set_protocol_fee",
  getAppRoles: "get_app_roles",
  getProtocolFeeInfo: "get_protocol_fee_info",
  getApp: "get_app",
  getTemplate: "get_template",
  getCase: "get_case",
  getCaseEvidence: "get_case_evidence",
  getCaseVerdict: "get_case_verdict",
  getCaseAppeal: "get_case_appeal",
  getCasesByApp: "get_cases_by_app",
  getCasesByParty: "get_cases_by_party",
  getAllApps: "get_all_apps",
  getAppTemplates: "get_app_templates",
  getAllCases: "get_all_cases",
} as const;

export function hasContractAddress() {
  return CONTRACT_ADDRESS.length > 0;
}

export function requireContractAddress(): `0x${string}` {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not set. Deploy DisputeOSProtocol to StudioNet and set the address in .env.local.",
    );
  }
  return CONTRACT_ADDRESS as `0x${string}`;
}

// A read-only client for public console views that have not connected a
// wallet yet. GenLayer view calls do not require a signer, but the SDK
// still expects a client instance.
let readOnlyClient: ReturnType<typeof makeClient> | null = null;
export function getReadOnlyClient() {
  if (!readOnlyClient) {
    readOnlyClient = makeClient();
  }
  return readOnlyClient;
}
