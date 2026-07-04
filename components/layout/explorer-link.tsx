import { ExternalLink } from "lucide-react";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/genlayer/config";
import { shortAddress } from "@/lib/format";

export function ExplorerAddressLink({ address, label }: { address: string; label?: string }) {
  return (
    <a
      href={explorerAddressUrl(address)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-judgement-cyan hover:underline"
    >
      {label ?? shortAddress(address)}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function ExplorerTxLink({ hash, label }: { hash: string; label?: string }) {
  return (
    <a
      href={explorerTxUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-judgement-cyan hover:underline"
    >
      {label ?? shortAddress(hash, 6)}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
