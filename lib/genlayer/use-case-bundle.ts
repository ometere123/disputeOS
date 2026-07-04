"use client";

import { useCallback } from "react";
import { useContractRead } from "./hooks";
import type {
  Appeal,
  DisputeCase,
  DisputeTemplate,
  EvidenceItem,
  RegisteredApp,
  Verdict,
} from "./types";

export function useCaseBundle(caseId: number) {
  const caseQ = useContractRead<DisputeCase>("get_case", [caseId]);
  const evidenceQ = useContractRead<EvidenceItem[]>("get_case_evidence", [caseId]);
  const verdictQ = useContractRead<Verdict | Record<string, never>>("get_case_verdict", [caseId]);
  const appealQ = useContractRead<Appeal | Record<string, never>>("get_case_appeal", [caseId]);
  const appQ = useContractRead<RegisteredApp>("get_app", [caseQ.data?.app_id ?? 0], {
    enabled: !!caseQ.data,
  });
  const templateQ = useContractRead<DisputeTemplate>("get_template", [caseQ.data?.template_id ?? 0], {
    enabled: !!caseQ.data,
  });

  const verdict =
    verdictQ.data && Object.keys(verdictQ.data).length > 0 ? (verdictQ.data as Verdict) : null;
  const appeal =
    appealQ.data && Object.keys(appealQ.data).length > 0 ? (appealQ.data as Appeal) : null;

  // Stagger the 6 reads by 50 ms each so they don't all count against
  // StudioNet's burst window (20 gen_call / 10 s per contract address).
  const refetchAll = useCallback(() => {
    const reads = [caseQ.refetch, evidenceQ.refetch, verdictQ.refetch, appealQ.refetch, appQ.refetch, templateQ.refetch];
    reads.forEach((fn, i) => setTimeout(() => fn(true), i * 50));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    disputeCase: caseQ.data,
    app: appQ.data,
    template: templateQ.data,
    evidence: evidenceQ.data ?? [],
    verdict,
    appeal,
    loading: caseQ.loading || appQ.loading || templateQ.loading,
    error: caseQ.error,
    refetchAll,
  };
}
