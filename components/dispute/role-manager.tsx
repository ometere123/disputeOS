"use client";

import { useState } from "react";
import { ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractRead, useContractWrite } from "@/lib/genlayer/hooks";
import { shortAddress } from "@/lib/format";
import type { AppRoleGrant } from "@/lib/genlayer/types";

interface RoleManagerProps {
  appId: number;
}

// App-owner-only panel for delegating "admin" / "moderator" access to other
// addresses. Moderators can close evidence and request verdicts on behalf of
// the app but can never claim settlement or change ownership.
export function RoleManager({ appId }: RoleManagerProps) {
  const { data: roles, loading, refetch } = useContractRead<AppRoleGrant[]>("get_app_roles", [appId]);
  const grantRole = useContractWrite("grant_role");
  const revokeRole = useContractWrite("revoke_role");

  const [address, setAddress] = useState("");
  const [role, setRole] = useState<"admin" | "moderator">("moderator");

  async function handleGrant() {
    if (!address.trim()) return;
    await grantRole.write([appId, address.trim(), role]);
    setAddress("");
    refetch(true);
  }

  async function handleRevoke(targetAddress: string) {
    await revokeRole.write([appId, targetAddress]);
    refetch(true);
  }

  return (
    <div className="rounded-lg border border-border bg-panel-ash/40 p-6">
      <div className="flex items-center gap-2 text-judgement-cyan">
        <ShieldCheck className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Roles &amp; Permissions</span>
      </div>
      <p className="mt-2 text-sm text-muted">
        Delegate case-management access without handing over ownership. Moderators can close evidence
        windows and request verdicts; they can never claim settlement or transfer ownership.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">Address</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1 font-mono"
          />
        </div>
        <div className="w-full sm:w-40">
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "admin" | "moderator")}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="moderator">moderator</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGrant} disabled={!address.trim() || grantRole.status === "pending"}>
          <UserPlus className="h-4 w-4" /> Grant
        </Button>
      </div>
      {grantRole.error && <p className="mt-2 text-sm text-fault-red">{grantRole.error}</p>}
      {revokeRole.error && <p className="mt-2 text-sm text-fault-red">{revokeRole.error}</p>}

      <div className="mt-5 space-y-2">
        {loading ? (
          <p className="text-sm text-muted">Loading roles…</p>
        ) : !roles || roles.length === 0 ? (
          <p className="text-sm text-muted">No roles granted yet.</p>
        ) : (
          roles.map((grant) => (
            <div
              key={grant.address}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground/85">{shortAddress(grant.address)}</span>
                <Badge variant={grant.role === "admin" ? "purple" : "outline"}>{grant.role}</Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRevoke(grant.address)}
                disabled={revokeRole.status === "pending"}
              >
                <UserMinus className="h-3.5 w-3.5" /> Revoke
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
