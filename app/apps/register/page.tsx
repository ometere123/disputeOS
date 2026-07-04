"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/genlayer/wallet";
import { useContractWrite } from "@/lib/genlayer/hooks";
import { getReadOnlyClient, requireContractAddress } from "@/lib/genlayer/contract";
import { ExplorerTxLink } from "@/components/layout/explorer-link";
import type { RegisteredApp } from "@/lib/genlayer/types";

export default function RegisterAppPage() {
  const { status, address, connect } = useWallet();
  const router = useRouter();
  const { write, status: writeStatus, txHash, error, result } = useContractWrite("register_app");
  const [submittedApp, setSubmittedApp] = useState<{
    name: string;
    domain: string;
    description: string;
  } | null>(null);

  const [name, setName] = useState("BuildMarket");
  const [domain, setDomain] = useState("buildmarket.example");
  const [description, setDescription] = useState(
    "A marketplace connecting clients with freelance builders for landing page delivery projects.",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "connected") {
      await connect();
      return;
    }
    setSubmittedApp({ name, domain, description });
    const receipt = await write([name, domain, description]);
    if (receipt) {
      setTimeout(() => router.push("/apps"), 1200);
    }
  }

  useEffect(() => {
    if (!submittedApp || !address || !["signing", "pending"].includes(writeStatus)) return;
    let cancelled = false;
    const ownerAddress = address.toLowerCase();
    const expectedApp = submittedApp;

    async function recoverAcceptedRegistration() {
      try {
        const client = getReadOnlyClient();
        const contractAddress = requireContractAddress();
        const apps = (await client.readContract({
          address: contractAddress,
          functionName: "get_all_apps",
          args: [],
        })) as unknown as RegisteredApp[];
        const match = apps.find(
          (app) =>
            app.owner.toLowerCase() === ownerAddress &&
            app.name === expectedApp.name &&
            app.domain === expectedApp.domain &&
            app.description === expectedApp.description,
        );
        if (!cancelled && match) {
          router.push("/apps");
        }
      } catch {
        // The transaction may still be indexing/finalizing; keep polling.
      }
    }

    recoverAcceptedRegistration();
    const interval = setInterval(recoverAcceptedRegistration, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, router, submittedApp, writeStatus]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">
        App &amp; Template Methods · register_app
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Register App</h1>
      <p className="mt-2 text-muted">
        Registering turns your app into a DisputeOSProtocol integrator. You&apos;ll be able to
        define dispute templates and open cases against them.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>App identity</CardTitle>
          <CardDescription>Stored on-chain via register_app(name, domain, description).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={80} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} required minLength={3} maxLength={120} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="mt-1.5" />
            </div>

            <Button type="submit" disabled={writeStatus === "signing" || writeStatus === "pending"} className="w-full">
              {status !== "connected"
                ? "Connect Wallet to Continue"
                : writeStatus === "signing"
                  ? "Waiting for signature…"
                  : writeStatus === "pending"
                    ? "Confirming on StudioNet…"
                    : "Register App"}
            </Button>

            {error && <p className="text-sm text-fault-red">{error}</p>}
            {txHash && (
              <p className="text-sm text-muted">
                Transaction: <ExplorerTxLink hash={txHash} />
              </p>
            )}
            {writeStatus === "accepted" && (
              <p className="text-sm text-settlement-green">
                App registered{result ? "" : "."} Redirecting to the app directory…
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
