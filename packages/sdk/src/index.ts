import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type {
  RegisteredApp,
  DisputeTemplate,
  DisputeCase,
  EvidenceItem,
  Verdict,
  Appeal,
  DisputeOSConfig,
  WriteResult,
  VerdictCategory,
  SettlementMode,
  AppealBasis,
} from "./types";

export type { DisputeOSConfig, WriteResult } from "./types";
export * from "./types";
export * from "./helpers";

type Client = ReturnType<typeof createClient>;

export class DisputeOS {
  private client: Client;
  private contractAddress: `0x${string}`;

  constructor(config: DisputeOSConfig) {
    this.contractAddress = config.contractAddress as `0x${string}`;

    const chain = config.chain ?? (config.rpcUrl
      ? { ...studionet, rpcUrls: { default: { http: [config.rpcUrl] } } }
      : studionet);

    this.client = createClient({
      chain,
      ...(config.account ? { account: config.account } : {}),
    } as unknown as Parameters<typeof createClient>[0]);
  }

  // ── Write helpers ──────────────────────────────────────────────────

  private async write(
    functionName: string,
    args: unknown[],
    value?: bigint,
  ): Promise<WriteResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txHash = await (this.client as any).writeContract({
      address: this.contractAddress,
      functionName,
      args,
      ...(value !== undefined ? { value } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const receipt = await (this.client as any).waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED",
      retries: 60,
      interval: 3000,
    });
    return { txHash, receipt };
  }

  private async read<T>(functionName: string, args: unknown[] = []): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client as any).readContract({
      address: this.contractAddress,
      functionName,
      args,
    });
  }

  // ── Write methods ──────────────────────────────────────────────────

  async registerApp(params: {
    name: string;
    domain: string;
    description: string;
  }): Promise<WriteResult> {
    return this.write("register_app", [
      params.name,
      params.domain,
      params.description,
    ]);
  }

  async createTemplate(params: {
    appId: number;
    name: string;
    caseType: string;
    rules: string;
    requiredEvidence: string;
    allowedVerdicts: VerdictCategory[];
    settlementMode: SettlementMode;
    appealEnabled: boolean;
    appealWindow: number;
    publicVisibility: boolean;
  }): Promise<WriteResult> {
    return this.write("create_template", [
      params.appId,
      params.name,
      params.caseType,
      params.rules,
      params.requiredEvidence,
      params.allowedVerdicts,
      params.settlementMode,
      params.appealEnabled,
      params.appealWindow,
      params.publicVisibility,
    ]);
  }

  async openCase(params: {
    appId: number;
    templateId: number;
    respondent: string;
    caseSummary: string;
    requestedRemedy: string;
    evidenceDeadline: number;
  }): Promise<WriteResult> {
    return this.write("open_case", [
      params.appId,
      params.templateId,
      params.respondent,
      params.caseSummary,
      params.requestedRemedy,
      params.evidenceDeadline,
    ]);
  }

  async fundCase(params: {
    caseId: number;
    amountGEN: number;
  }): Promise<WriteResult> {
    const value = BigInt(Math.floor(params.amountGEN * 1e18));
    return this.write("fund_case", [params.caseId], value);
  }

  async respondToCase(params: {
    caseId: number;
    response: string;
  }): Promise<WriteResult> {
    return this.write("respond_to_case", [params.caseId, params.response]);
  }

  async submitEvidence(params: {
    caseId: number;
    evidenceType: string;
    title: string;
    statement: string;
    publicUrl: string;
  }): Promise<WriteResult> {
    return this.write("submit_evidence", [
      params.caseId,
      params.evidenceType,
      params.title,
      params.statement,
      params.publicUrl,
    ]);
  }

  async closeEvidence(params: { caseId: number }): Promise<WriteResult> {
    return this.write("close_evidence", [params.caseId]);
  }

  async requestVerdict(params: { caseId: number }): Promise<WriteResult> {
    return this.write("request_verdict", [params.caseId]);
  }

  async fileAppeal(params: {
    caseId: number;
    basis: AppealBasis;
    statement: string;
    evidenceUrls: string[];
  }): Promise<WriteResult> {
    return this.write("file_appeal", [
      params.caseId,
      params.basis,
      params.statement,
      params.evidenceUrls,
    ]);
  }

  async requestAppealReview(params: {
    caseId: number;
    appealId: number;
  }): Promise<WriteResult> {
    return this.write("request_appeal_review", [
      params.caseId,
      params.appealId,
    ]);
  }

  async finalizeCase(params: { caseId: number }): Promise<WriteResult> {
    return this.write("finalize_case", [params.caseId]);
  }

  async claimSettlement(params: { caseId: number }): Promise<WriteResult> {
    return this.write("claim_settlement", [params.caseId]);
  }

  /**
   * Resolve a case stuck in `manual_review_required`. App-owner only.
   * Requires the pending contract changes in docs/FUTURE_CONTRACT_CHANGES.md —
   * not yet available on the currently deployed StudioNet contract.
   */
  async resolveManualReview(params: {
    caseId: number;
    verdict: VerdictCategory;
    winner: string;
    complainantBps: number;
    respondentBps: number;
    reasonCode: string;
    shortReason: string;
  }): Promise<WriteResult> {
    return this.write("resolve_manual_review", [
      params.caseId,
      params.verdict,
      params.winner,
      params.complainantBps,
      params.respondentBps,
      params.reasonCode,
      params.shortReason,
    ]);
  }

  /** App-owner only. Requires the pending role/permission contract changes. */
  async grantRole(params: {
    appId: number;
    address: string;
    role: "admin" | "moderator";
  }): Promise<WriteResult> {
    return this.write("grant_role", [params.appId, params.address, params.role]);
  }

  /** App-owner only. Requires the pending role/permission contract changes. */
  async revokeRole(params: { appId: number; address: string }): Promise<WriteResult> {
    return this.write("revoke_role", [params.appId, params.address]);
  }

  /** Protocol-admin only. Requires the pending protocol fee contract changes. */
  async setProtocolFee(params: { recipient: string; feeBps: number }): Promise<WriteResult> {
    return this.write("set_protocol_fee", [params.recipient, params.feeBps]);
  }

  // ── Read methods ───────────────────────────────────────────────────

  async getAllApps(): Promise<RegisteredApp[]> {
    return this.read("get_all_apps");
  }

  async getApp(appId: number): Promise<RegisteredApp> {
    return this.read("get_app", [appId]);
  }

  async getAppTemplates(appId: number): Promise<DisputeTemplate[]> {
    return this.read("get_app_templates", [appId]);
  }

  async getTemplate(templateId: number): Promise<DisputeTemplate> {
    return this.read("get_template", [templateId]);
  }

  async getAllCases(): Promise<DisputeCase[]> {
    return this.read("get_all_cases");
  }

  async getCase(caseId: number): Promise<DisputeCase> {
    return this.read("get_case", [caseId]);
  }

  async getCasesByApp(appId: number): Promise<DisputeCase[]> {
    return this.read("get_cases_by_app", [appId]);
  }

  async getCasesByParty(address: string): Promise<DisputeCase[]> {
    return this.read("get_cases_by_party", [address]);
  }

  async getCaseEvidence(caseId: number): Promise<EvidenceItem[]> {
    return this.read("get_case_evidence", [caseId]);
  }

  async getCaseVerdict(caseId: number): Promise<Verdict | null> {
    return this.read("get_case_verdict", [caseId]);
  }

  async getCaseAppeals(caseId: number): Promise<Appeal[]> {
    return this.read("get_case_appeal", [caseId]);
  }

  /** Requires the pending role/permission contract changes. */
  async getAppRoles(appId: number): Promise<{ address: string; role: string }[]> {
    return this.read("get_app_roles", [appId]);
  }

  /** Requires the pending protocol fee contract changes. */
  async getProtocolFeeInfo(): Promise<{ admin: string; fee_recipient: string; fee_bps: number }> {
    return this.read("get_protocol_fee_info");
  }
}
