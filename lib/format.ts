export function shortAddress(address: string | null | undefined, size = 4): string {
  if (!address) return "—";
  if (address.length <= size * 2 + 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function formatGen(amount: string | number | bigint): string {
  const n = typeof amount === "bigint" ? Number(amount) : Number(amount);
  if (Number.isNaN(n)) return "0 GEN";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} GEN`;
}

export function weiToGen(wei: bigint): number {
  return Number(wei) / 1e18;
}

export function genToWei(gen: number | string): bigint {
  const n = typeof gen === "string" ? parseFloat(gen) : gen;
  return BigInt(Math.round(n * 1e18));
}

export function formatTimestamp(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function timeUntil(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return "—";
  const diffMs = unixSeconds * 1000 - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const label =
    mins < 60
      ? `${mins}m`
      : mins < 1440
        ? `${Math.round(mins / 60)}h`
        : `${Math.round(mins / 1440)}d`;
  return diffMs >= 0 ? `in ${label}` : `${label} ago`;
}

export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
