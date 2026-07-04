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
import { shortAddress, weiToGen } from "@/lib/format";

export function WalletButton() {
  const {
    status,
    mode,
    address,
    balance,
    error,
    connect,
    connectBrowserSession,
    disconnect,
    rotateWallet,
    exportPrivateKey,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  if (status !== "connected") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button onClick={() => connect()} disabled={status === "connecting"} size="sm">
          <Wallet className="h-4 w-4" />
          {status === "connecting" ? "Connecting..." : "Connect Wallet"}
        </Button>
        {error && <p className="max-w-56 text-right text-[11px] text-fault-red">{error}</p>}
        {error && (
          <button
            type="button"
            onClick={() => connectBrowserSession()}
            className="text-[11px] text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            Use test session wallet
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="font-mono">
        <span className="h-2 w-2 rounded-full bg-settlement-green animate-pulse-glow" />
        {shortAddress(address)}
        {balance !== null && (
          <span className="text-muted">· {weiToGen(balance).toFixed(2)} GEN</span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">
              {mode === "browser" ? "StudioNet Session Wallet" : "Injected Wallet"}
            </DialogTitle>
            <DialogDescription>
              {mode === "browser"
                ? "This is a hidden browser-managed fallback for GenLayer StudioNet demos. A local key is generated, held in this browser, and used to sign transactions. It is not a custody solution."
                : "Transactions are signed by your injected wallet, such as MetaMask or Rabby. DisputeOS does not store or reveal your private key."}
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
                  {copied ? <Check className="h-4 w-4 text-settlement-green" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>Balance</Label>
              <p className="mt-1 font-mono text-lg">
                {balance !== null ? `${weiToGen(balance).toFixed(4)} GEN` : "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {mode === "browser" && (
                <>
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
                      if (confirm("Rotate to a brand new StudioNet identity? The old one stays valid but this browser will forget it.")) {
                        rotateWallet();
                        setRevealed(null);
                      }
                    }}
                  >
                    <RotateCw className="h-4 w-4" />
                    New identity
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  disconnect();
                  setRevealed(null);
                  setOpen(false);
                }}
              >
                Disconnect
              </Button>
            </div>
            {revealed && (
              <p className="break-all rounded-md border border-fault-red/40 bg-fault-red/5 p-2 font-mono text-xs text-fault-red">
                {revealed}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
