# Browser-Managed Injected Wallet Pattern

This document explains the browser-managed wallet pattern used in the current DisputeOS reference console.

It is useful for demos, local dev, testnets, hackathons, and networks that do not yet have a mainstream browser extension wallet.

It is not a custody solution and should not be used for production user funds without a real security review.

---

## What This Pattern Does

The app creates a wallet inside the browser.

It:

1. Generates a private key with the chain SDK.
2. Stores the private key in `localStorage`.
3. Derives the account/address from that private key.
4. Creates a signed client using that account.
5. Uses the client for write transactions.
6. Shows a wallet modal with:
   - address
   - copy address
   - balance
   - reveal private key
   - new identity / rotate wallet
   - disconnect

In DisputeOS, this is used as a StudioNet session wallet.

The UX feels like an injected wallet because the app has a connected account available globally through React context, but the private key is actually browser-managed by the app.

---

## When To Use It

Good use cases:

- Testnet demos
- Internal prototypes
- Hackathon submissions
- Local wallets for fake or faucet funds
- Networks without mature extension wallet support
- Developer tools where exportable keys are useful

Avoid for:

- Mainnet user funds
- Real customer custody
- Apps with high-value wallets
- Apps where users expect MetaMask/Rabby/Ledger-grade key management

---

## Required Dependencies

For the DisputeOS version:

```bash
npm install genlayer-js lucide-react
```

The UI examples also assume local button, input, label, and dialog components:

```text
components/ui/button.tsx
components/ui/input.tsx
components/ui/label.tsx
components/ui/dialog.tsx
```

You can swap these for any component library.

---

## Environment Config

Example:

```env
NEXT_PUBLIC_CHAIN_NAME=GenLayer StudioNet
NEXT_PUBLIC_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x...
```

Use a stable localStorage key:

```ts
export const WALLET_STORAGE_KEY = "yourapp.wallet.privateKey";
```

For DisputeOS:

```ts
export const WALLET_STORAGE_KEY = "disputeos.wallet.privateKey";
```

---

## Client Helper

Create a chain/client helper.

In DisputeOS this is `lib/genlayer/client.ts`.

```ts
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const appChain = {
  ...studionet,
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 61999),
  name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? "GenLayer StudioNet",
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ??
          "https://studio.genlayer.com/api",
      ],
    },
  },
};

export type GenAccount = ReturnType<typeof createAccount>;

export function newPrivateKey(): `0x${string}` {
  return generatePrivateKey();
}

export function accountFromKey(privateKey: `0x${string}`): GenAccount {
  return createAccount(privateKey);
}

export function makeClient(account?: GenAccount) {
  return createClient({
    chain: appChain,
    account,
  });
}

export type AppClient = ReturnType<typeof makeClient>;
```

Key idea:

- `makeClient()` without an account is read-only.
- `makeClient(account)` can sign transactions using the browser-managed key.

---

## Wallet Provider

Create a React context provider.

In DisputeOS this is `lib/genlayer/wallet.tsx`.

```tsx
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
  type AppClient,
  type GenAccount,
} from "./client";
import { WALLET_STORAGE_KEY } from "./config";

type WalletStatus = "disconnected" | "connecting" | "connected";

interface WalletContextValue {
  status: WalletStatus;
  address: string | null;
  client: AppClient | null;
  balance: bigint | null;
  connect: () => Promise<void>;
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

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [account, setAccount] = useState<GenAccount | null>(null);
  const [client, setClient] = useState<AppClient | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [privateKey, setPrivateKey] = useState<`0x${string}` | null>(null);

  const buildSession = useCallback((key: `0x${string}`) => {
    const nextAccount = accountFromKey(key);
    const nextClient = makeClient(nextAccount);
    setPrivateKey(key);
    setAccount(nextAccount);
    setClient(nextClient);
    setStatus("connected");
    return nextClient;
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!client || !account) return;
    try {
      const bal = await client.getBalance({ address: account.address });
      setBalance(bal);
    } catch {
      // Network may briefly be unavailable. Keep the previous balance.
    }
  }, [client, account]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    const existing = loadStoredKey();
    const key = existing ?? newPrivateKey();
    if (!existing) storeKey(key);
    buildSession(key);
  }, [buildSession]);

  const disconnect = useCallback(() => {
    setStatus("disconnected");
    setAccount(null);
    setClient(null);
    setBalance(null);
  }, []);

  const importPrivateKey = useCallback(
    async (key: string) => {
      const normalized = key.trim() as `0x${string}`;
      if (!normalized.startsWith("0x") || normalized.length !== 66) {
        throw new Error("Private key must be a 0x-prefixed 32-byte hex string.");
      }
      storeKey(normalized);
      buildSession(normalized);
    },
    [buildSession],
  );

  const rotateWallet = useCallback(async () => {
    const key = newPrivateKey();
    storeKey(key);
    buildSession(key);
  }, [buildSession]);

  const exportPrivateKey = useCallback(() => privateKey, [privateKey]);

  useEffect(() => {
    const existing = loadStoredKey();
    if (existing) {
      buildSession(existing);
    }
  }, [buildSession]);

  useEffect(() => {
    if (status !== "connected") return;
    refreshBalance();
    const interval = setInterval(refreshBalance, 15_000);
    return () => clearInterval(interval);
  }, [status, refreshBalance]);

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      address: account?.address ?? null,
      client,
      balance,
      connect,
      disconnect,
      importPrivateKey,
      exportPrivateKey,
      rotateWallet,
      refreshBalance,
    }),
    [
      status,
      account,
      client,
      balance,
      connect,
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
```

---

## Add Provider To App Layout

Wrap the app in `WalletProvider`.

Example:

```tsx
import { WalletProvider } from "@/lib/genlayer/wallet";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
```

---

## Wallet Button And Modal

Create a wallet button that opens a modal.

In DisputeOS this is `components/layout/wallet-button.tsx`.

```tsx
"use client";

import { useState } from "react";
import { Wallet, Copy, RotateCw, KeyRound, Check } from "lucide-react";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function shortAddress(address: string | null | undefined, size = 4): string {
  if (!address) return "-";
  if (address.length <= size * 2 + 2) return address;
  return `${address.slice(0, size + 2)}...${address.slice(-size)}`;
}

function weiToToken(value: bigint): number {
  return Number(value) / 1e18;
}

export function WalletButton() {
  const {
    status,
    address,
    balance,
    connect,
    disconnect,
    rotateWallet,
    exportPrivateKey,
  } = useWallet();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  if (status !== "connected") {
    return (
      <Button onClick={() => connect()} disabled={status === "connecting"} size="sm">
        <Wallet className="h-4 w-4" />
        {status === "connecting" ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <span className="h-2 w-2 rounded-full bg-green-500" />
        {shortAddress(address)}
        {balance !== null && (
          <span className="text-muted-foreground">
            {" "}
            {weiToToken(balance).toFixed(2)} TOKEN
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Browser Session Wallet</DialogTitle>
            <DialogDescription>
              A local key is generated, held in this browser, and used to sign
              transactions. This is not a custody solution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Address</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input readOnly value={address ?? ""} className="text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(address ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>Balance</Label>
              <p className="mt-1 font-mono text-lg">
                {balance !== null ? `${weiToToken(balance).toFixed(4)} TOKEN` : "-"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevealed(revealed ? null : exportPrivateKey())}
              >
                <KeyRound className="h-4 w-4" />
                {revealed ? "Hide private key" : "Reveal private key"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      "Rotate to a brand new identity? The old one stays valid but this browser will forget it.",
                    )
                  ) {
                    rotateWallet();
                  }
                }}
              >
                <RotateCw className="h-4 w-4" />
                New identity
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                Disconnect
              </Button>
            </div>

            {revealed && (
              <p className="break-all rounded-md border border-red-500/40 bg-red-500/5 p-2 font-mono text-xs text-red-500">
                {revealed}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## How Write Calls Use The Wallet

Any write hook should use the connected wallet client from context.

Example:

```ts
const { client, address } = useWallet();

if (!client || !address) {
  throw new Error("Connect wallet first.");
}

const hash = await client.writeContract({
  address: contractAddress,
  functionName: "submit_evidence",
  args: [caseId, evidenceType, title, statement, publicUrl],
  value: BigInt(0),
});
```

Reads can use a read-only client:

```ts
const readClient = makeClient();

const result = await readClient.readContract({
  address: contractAddress,
  functionName: "get_case",
  args: [caseId],
});
```

---

## Import Private Key Flow

The provider includes `importPrivateKey`, even if the DisputeOS modal does not currently expose an import form.

You can add one like this:

```tsx
const { importPrivateKey } = useWallet();
const [key, setKey] = useState("");
const [error, setError] = useState<string | null>(null);

async function onImport() {
  try {
    setError(null);
    await importPrivateKey(key);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to import key.");
  }
}
```

```tsx
<Input
  value={key}
  onChange={(e) => setKey(e.target.value)}
  placeholder="0x..."
/>
<Button onClick={onImport}>Import private key</Button>
{error && <p>{error}</p>}
```

---

## Security Notes

This pattern stores the private key in browser `localStorage`.

That means:

- Any script running on the page can potentially read the key.
- XSS becomes wallet compromise.
- Browser extensions may be able to inspect page state.
- Users can lose the wallet if localStorage is cleared and they did not export the key.
- Disconnecting does not delete the key unless you explicitly remove it from localStorage.

If you want disconnect to forget the key, add:

```ts
window.localStorage.removeItem(WALLET_STORAGE_KEY);
```

inside `disconnect`.

DisputeOS intentionally does not remove the key on disconnect, because disconnect is treated as ending the session in React state, not destroying the generated identity.

---

## Recommended UX Copy

Use honest copy in the modal:

```text
This is a browser-managed session wallet. A local key is generated, stored in this browser, and used to sign testnet transactions. Export the private key if you need to recover this identity. Do not use this for production funds.
```

---

## Checklist For Reusing In Another Project

1. Add chain config.
2. Add `WALLET_STORAGE_KEY`.
3. Add `client.ts` helper.
4. Add `wallet.tsx` provider.
5. Wrap the app with `WalletProvider`.
6. Add `WalletButton`.
7. Use `client` from `useWallet()` for writes.
8. Use read-only client for public reads.
9. Add import/reveal/rotate UI if needed.
10. Add clear warning copy if real users will touch it.

---

## What To Rename Per Project

Replace:

```text
disputeos.wallet.privateKey
StudioNet Session Wallet
GEN
GenLayer StudioNet
```

With your new app/network/token names.

---

## Summary

This wallet pattern is best understood as:

> A browser-local testnet wallet wrapped in a React context, with a polished modal for address, balance, key export, and identity rotation.

It is excellent for fast demos and developer tools. For production, prefer a real injected wallet such as MetaMask, Rabby, WalletConnect, or a chain-specific wallet.
