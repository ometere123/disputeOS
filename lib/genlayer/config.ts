export const CHAIN_NAME =
  process.env.NEXT_PUBLIC_CHAIN_NAME ?? "GenLayer StudioNet";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 61999);

export const GENLAYER_RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api";

export const GENLAYER_EXPLORER_URL =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ??
  "https://explorer-studio.genlayer.com";

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ?? "";

export const WALLET_STORAGE_KEY = "disputeos.wallet.privateKey";

export function explorerAddressUrl(address: string) {
  return `${GENLAYER_EXPLORER_URL}/address/${address}`;
}

export function explorerTxUrl(hash: string) {
  return `${GENLAYER_EXPLORER_URL}/tx/${hash}`;
}
