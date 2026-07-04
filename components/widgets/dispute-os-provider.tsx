"use client";

import { WalletProvider } from "@/lib/genlayer/wallet";

interface DisputeOSProviderProps {
  contractAddress?: string;
  children: React.ReactNode;
}

/**
 * Wraps children with the necessary DisputeOS context providers.
 * Currently delegates to WalletProvider (contract address comes from env).
 * Future SDK versions will accept contractAddress as an override.
 */
export function DisputeOSProvider({ children }: DisputeOSProviderProps) {
  return <WalletProvider>{children}</WalletProvider>;
}
