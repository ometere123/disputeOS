"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransactionStatus } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import { useWallet } from "./wallet";
import { getReadOnlyClient, requireContractAddress } from "./contract";

type CalldataEncodable = string | number | boolean | bigint | null | CalldataEncodable[];

// ---------------------------------------------------------------------------
// Module-level read cache — deduplicates concurrent gen_call requests and
// short-circuits re-renders that fire before the last result has gone stale.
// This keeps the frontend under StudioNet's 20 gen_call/10 s rate limit even
// when several useContractRead hooks mount simultaneously (e.g. useCaseBundle).
// ---------------------------------------------------------------------------
const READ_CACHE_TTL = 5_000; // ms — data freshness window
const readCache = new Map<string, { data: unknown; ts: number }>();
const inFlight = new Map<string, Promise<unknown>>();

function cacheKey(fn: string, args: string) {
  return `${fn}::${args}`;
}

async function dedupedRead(
  fn: string,
  args: CalldataEncodable[],
  argsKey: string,
  force: boolean,
): Promise<unknown> {
  const key = cacheKey(fn, argsKey);

  if (!force) {
    const cached = readCache.get(key);
    if (cached && Date.now() - cached.ts < READ_CACHE_TTL) {
      return cached.data;
    }
    const existing = inFlight.get(key);
    if (existing) return existing;
  } else {
    readCache.delete(key);
  }

  const client = getReadOnlyClient();
  const address = requireContractAddress();
  const promise = client.readContract({ address, functionName: fn, args });
  inFlight.set(key, promise);
  try {
    const result = await promise;
    readCache.set(key, { data: result, ts: Date.now() });
    return result;
  } finally {
    inFlight.delete(key);
  }
}

export function useContractRead<T>(
  functionName: string,
  args: CalldataEncodable[] = [],
  options?: { enabled?: boolean },
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const enabled = options?.enabled ?? true;
  const depsKey = JSON.stringify(args);

  const refetch = useCallback(
    async (force = false) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const result = await dedupedRead(functionName, args, depsKey, force);
        setData(result as T);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read contract state.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [functionName, depsKey, enabled],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, error, loading, refetch };
}

type WriteStatus = "idle" | "signing" | "pending" | "accepted" | "finalized" | "error";
const WRITE_HASH_TIMEOUT_MS = 12_000;
const HASH_TIMEOUT = Symbol("hash-timeout");

export function useContractWrite(functionName: string) {
  const { client, address } = useWallet();
  const [status, setStatus] = useState<WriteStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const write = useCallback(
    async (args: CalldataEncodable[] = [], value: bigint = BigInt(0)) => {
      if (!client || !address) {
        throw new Error("Connect a StudioNet wallet before sending a transaction.");
      }
      setStatus("signing");
      setError(null);
      setTxHash(null);
      setResult(null);
      try {
        const contractAddress = requireContractAddress();
        const hashPromise = client.writeContract({
          address: contractAddress,
          functionName,
          args,
          value,
        });
        setStatus("pending");
        const continueWithHash = async (hash: Hash) => {
          if (!mounted.current) return null;
          setTxHash(hash);
          setStatus("pending");
          const receipt = await client.waitForTransactionReceipt({
            hash,
            status: TransactionStatus.ACCEPTED,
            retries: 60,
            interval: 3000,
          });
          if (!mounted.current) return null;
          setStatus("accepted");
          setResult(receipt);
          return receipt;
        };
        const hash = await Promise.race([
          hashPromise,
          new Promise<typeof HASH_TIMEOUT>((resolve) =>
            setTimeout(() => resolve(HASH_TIMEOUT), WRITE_HASH_TIMEOUT_MS),
          ),
        ]);
        if (!mounted.current) return null;
        if (hash === HASH_TIMEOUT) {
          setStatus("pending");
          hashPromise
            .then((lateHash) => continueWithHash(lateHash))
            .catch((err) => {
              if (!mounted.current) return;
              const message = err instanceof Error ? err.message : "Transaction failed.";
              setError(message);
              setStatus("error");
            });
          return null;
        }
        return await continueWithHash(hash);
      } catch (err) {
        if (!mounted.current) return null;
        const message = err instanceof Error ? err.message : "Transaction failed.";
        setError(message);
        setStatus("error");
        throw err;
      }
    },
    [client, address, functionName],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setError(null);
    setResult(null);
  }, []);

  return { write, status, txHash, error, result, reset };
}
