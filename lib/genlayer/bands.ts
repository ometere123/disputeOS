// Equivalence Principle helpers — display logic for the settlement bands
// used across the reference console. These mirror the normalization the
// contract itself performs before validators compare leader/validator
// verdicts, so the UI communicates the same "meaning" the chain agreed on.

export const SETTLEMENT_BANDS = [0, 2500, 5000, 7500, 10000] as const;

export function nearestSettlementBand(complainantBps: number): number {
  return SETTLEMENT_BANDS.reduce((closest, band) =>
    Math.abs(band - complainantBps) < Math.abs(closest - complainantBps) ? band : closest,
  );
}

export function settlementBandLabel(complainantBps: number): string {
  const band = nearestSettlementBand(complainantBps);
  const respondentBand = 10000 - band;
  return `${band / 100}/${respondentBand / 100}`;
}

const CONFIDENCE_BANDS = [
  { max: 20, label: "low" },
  { max: 50, label: "moderate" },
  { max: 80, label: "high" },
  { max: 100, label: "very high" },
];

export function confidenceBand(confidence: number): string {
  return CONFIDENCE_BANDS.find((b) => confidence <= b.max)?.label ?? "very high";
}

export const EVIDENCE_ALIGNMENT_ORDER = ["none", "weak", "moderate", "strong", "decisive"];
export const RULE_FIT_ORDER = ["none", "weak", "partial", "strong", "exact"];

export function orderIndex(order: string[], value: string): number {
  const idx = order.indexOf(value);
  return idx === -1 ? 0 : idx;
}
