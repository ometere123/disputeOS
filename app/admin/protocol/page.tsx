"use client";

import { useState } from "react";
import { Landmark, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExplorerAddressLink, ExplorerTxLink } from "@/components/layout/explorer-link";
import { useContractRead, useContractWrite } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/genlayer/wallet";
import type { ProtocolFeeInfo } from "@/lib/genlayer/types";

export default function ProtocolAdminPage() {
  const { address } = useWallet();
  const { data: feeInfo, loading, refetch } = useContractRead<ProtocolFeeInfo>("get_protocol_fee_info", []);
  const setProtocolFee = useContractWrite("set_protocol_fee");

  const isProtocolAdmin = !!address && !!feeInfo && address.toLowerCase() === feeInfo.admin.toLowerCase();

  const [recipient, setRecipient] = useState("");
  const [feeBps, setFeeBps] = useState("0");

  async function handleSave() {
    if (!recipient.trim()) return;
    await setProtocolFee.write([recipient.trim(), Number(feeBps) || 0]);
    refetch(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">Protocol Administration</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Protocol Fee</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        DisputeOS can take a small basis-point cut of escrowed GEN settlements, paid to a fee recipient
        address at <code className="font-mono text-xs">claim_settlement</code> time. This is capped at
        10% (1000 bps) by the contract and can only be changed by the address that deployed the contract.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-muted">Loading protocol fee state…</p>
      ) : feeInfo ? (
        <div className="mt-8 rounded-lg border border-border bg-panel-ash/40 p-6">
          <div className="flex items-center gap-2 text-judgement-cyan">
            <Landmark className="h-4 w-4" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Current Configuration</span>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Protocol Admin</dt>
              <dd className="mt-1">
                <ExplorerAddressLink address={feeInfo.admin} />
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Fee Recipient</dt>
              <dd className="mt-1">
                <ExplorerAddressLink address={feeInfo.fee_recipient} />
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Current Fee</dt>
              <dd className="mt-1">
                <Badge variant={feeInfo.fee_bps > 0 ? "amber" : "muted"}>{(feeInfo.fee_bps / 100).toFixed(2)}%</Badge>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Your Wallet</dt>
              <dd className="mt-1 flex items-center gap-2">
                {address ? <ExplorerAddressLink address={address} /> : <span className="text-sm text-muted">Not connected</span>}
                {isProtocolAdmin && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-settlement-green">
                    <ShieldCheck className="h-3 w-3" /> admin
                  </span>
                )}
              </dd>
            </div>
          </dl>

          {isProtocolAdmin ? (
            <div className="mt-6 border-t border-border pt-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Update Fee</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">Fee Recipient</Label>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={feeInfo.fee_recipient}
                    className="mt-1 font-mono"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">Fee (bps, max 1000)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={feeBps}
                    onChange={(e) => setFeeBps(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>
                <Button onClick={handleSave} disabled={!recipient.trim() || setProtocolFee.status === "pending"}>
                  {setProtocolFee.status === "pending" ? "Saving…" : "Save"}
                </Button>
              </div>
              {setProtocolFee.error && <p className="mt-2 text-sm text-fault-red">{setProtocolFee.error}</p>}
              {setProtocolFee.txHash && (
                <p className="mt-2 text-xs text-muted">
                  <ExplorerTxLink hash={setProtocolFee.txHash} />
                </p>
              )}
            </div>
          ) : (
            <p className="mt-6 border-t border-border pt-6 text-sm text-muted">
              Only the protocol admin wallet can change this configuration.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-8 text-sm text-fault-red">Could not load protocol fee state.</p>
      )}
    </div>
  );
}
