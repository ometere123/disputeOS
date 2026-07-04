"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  accountFromKey,
  makeClient,
  newPrivateKey,
  type DisputeOSClient,
  type InjectedProvider,
} from "./client";
import { WALLET_STORAGE_KEY } from "./config";

type WalletStatus = "disconnected" | "connecting" | "connected";
type WalletMode = "injected" | "browser";
type WalletProviderCandidate = NonNullable<InjectedProvider>;

declare global {
  interface Window {
    ethereum?: WalletProviderCandidate;
  }
}

interface WalletContextValue {
  status: WalletStatus;
  mode: WalletMode | null;
  address: string | null;
  client: DisputeOSClient | null;
  balance: bigint | null;
  error: string | null;
  connect: () => Promise<void>;
  connectBrowserSession: () => Promise<void>;
  disconnect: () => void;
  importPrivateKey: (key: string) => Promise<void>;
  exportPrivateKey: () => string | null;
  rotateWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function loadStoredKey(): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
  if (raw && raw.startsWith("0x")) return raw as `0x${string}`;
  return null;
}

function storeKey(key: `0x${string}`) {
  window.localStorage.setItem(WALLET_STORAGE_KEY, key);
}

function getInjectedProvider(): WalletProviderCandidate | null {
  return window.ethereum ?? null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [client, setClient] = useState<DisputeOSClient | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [privateKey, setPrivateKey] = useState<`0x${string}` | null>(null);
  const [mode, setMode] = useState<WalletMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildBrowserSession = useCallback((key: `0x${string}`) => {
    const nextAccount = accountFromKey(key);
    const nextClient = makeClient(nextAccount);
    setPrivateKey(key);
    setAddress(nextAccount.address);
    setClient(nextClient);
    setMode("browser");
    setError(null);
    setStatus("connected");
    return nextClient;
  }, []);

  const buildInjectedSession = useCallback(
    async (nextAddress: `0x${string}`, provider: InjectedProvider) => {
      const nextClient = makeClient(nextAddress, provider);
      try {
        await nextClient.connect("studionet");
      } catch (err) {
        // Some extension combinations expose multiple global providers and
        // may fail the helper even after the chosen wallet has authorized the
        // site. Keep the account connected; write calls will still surface a
        // clear network error if the wallet is on the wrong chain.
        console.warn("Could not auto-switch injected wallet to StudioNet.", err);
      }
      setPrivateKey(null);
      setAddress(nextAddress);
      setClient(nextClient);
      setMode("injected");
      setError(null);
      setStatus("connected");
      return nextClient;
    },
    [],
  );

  const refreshBalance = useCallback(async () => {
    if (!client || !address) return;
    try {
      const bal = await client.getBalance({ address });
      setBalance(bal);
    } catch {
      // StudioNet may briefly be unavailable — leave prior balance in place.
    }
  }, [client, address]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    const provider = getInjectedProvider();
    if (!provider) {
      setStatus("disconnected");
      setError("No injected wallet found. Install MetaMask, Rabby, or another EIP-1193 wallet.");
      return;
    }
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as `0x${string}`[];
      const nextAddress = accounts[0];
      if (!nextAddress) {
        throw new Error("No wallet account was returned.");
      }
      await buildInjectedSession(nextAddress, provider);
    } catch (err) {
      setStatus("disconnected");
      setError(err instanceof Error ? err.message : "Injected wallet connection failed.");
    }
  }, [buildInjectedSession]);

  const connectBrowserSession = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    const existing = loadStoredKey();
    const key = existing ?? newPrivateKey();
    if (!existing) storeKey(key);
    buildBrowserSession(key);
  }, [buildBrowserSession]);

  const disconnect = useCallback(() => {
    setStatus("disconnected");
    setAddress(null);
    setClient(null);
    setBalance(null);
    setPrivateKey(null);
    setMode(null);
    setError(null);
  }, []);

  const importPrivateKey = useCallback(
    async (key: string) => {
      const normalized = key.trim() as `0x${string}`;
      if (!normalized.startsWith("0x") || normalized.length !== 66) {
        throw new Error("Private key must be a 0x-prefixed 32-byte hex string.");
      }
      storeKey(normalized);
      buildBrowserSession(normalized);
    },
    [buildBrowserSession],
  );

  const rotateWallet = useCallback(async () => {
    const key = newPrivateKey();
    storeKey(key);
    buildBrowserSession(key);
  }, [buildBrowserSession]);

  const exportPrivateKey = useCallback(() => privateKey, [privateKey]);

  // Auto-reconnect to an already-authorized injected wallet without opening a prompt.
  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;
    let cancelled = false;
    async function reconnectInjected() {
      try {
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as `0x${string}`[];
        const nextAddress = accounts[0];
        if (!cancelled && nextAddress) {
          await buildInjectedSession(nextAddress, provider);
        }
      } catch {
        // No-op: the user can connect manually from the wallet button.
      }
    }
    reconnectInjected();
    return () => {
      cancelled = true;
    };
  }, [buildInjectedSession]);

  useEffect(() => {
    if (status !== "connected") return;
    refreshBalance();
    const interval = setInterval(refreshBalance, 15_000);
    return () => clearInterval(interval);
  }, [status, refreshBalance]);

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      mode,
      address,
      client,
      balance,
      error,
      connect,
      connectBrowserSession,
      disconnect,
      importPrivateKey,
      exportPrivateKey,
      rotateWallet,
      refreshBalance,
    }),
    [
      status,
      mode,
      address,
      client,
      balance,
      error,
      connect,
      connectBrowserSession,
      disconnect,
      importPrivateKey,
      exportPrivateKey,
      rotateWallet,
      refreshBalance,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
