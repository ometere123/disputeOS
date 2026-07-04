import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Address } from "genlayer-js/types";
import { CHAIN_ID, CHAIN_NAME, GENLAYER_RPC_URL } from "./config";

// StudioNet is GenLayer's hosted reference network. We start from the
// SDK's built-in chain definition (consensus contract addresses, etc.)
// and only override the public-facing fields that ops may repoint via env.
export const disputeOSChain = {
  ...studionet,
  id: CHAIN_ID || studionet.id,
  name: CHAIN_NAME,
  rpcUrls: {
    default: { http: [GENLAYER_RPC_URL] },
  },
};

export type GenAccount = ReturnType<typeof createAccount>;
type ClientConfig = NonNullable<Parameters<typeof createClient>[0]>;
export type InjectedProvider = ClientConfig["provider"];

export function newPrivateKey(): `0x${string}` {
  return generatePrivateKey();
}

export function accountFromKey(privateKey: `0x${string}`): GenAccount {
  return createAccount(privateKey);
}

export function makeClient(account?: GenAccount | Address, provider?: InjectedProvider) {
  return createClient({
    chain: disputeOSChain,
    account,
    provider,
  });
}

export type DisputeOSClient = ReturnType<typeof makeClient>;
export type { Address };
