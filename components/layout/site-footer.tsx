import Link from "next/link";
import Image from "next/image";
import { CHAIN_NAME, GENLAYER_EXPLORER_URL, CONTRACT_ADDRESS } from "@/lib/genlayer/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/disputeos-mark.svg"
                alt=""
                aria-hidden="true"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0"
              />
              <p className="font-display text-sm font-semibold">
                Dispute<span className="text-judgement-cyan">OS</span>
              </p>
            </div>
            <p className="mt-2 max-w-xs text-sm text-muted">
              A reusable GenLayer Intelligent Contract for apps that need judgement. This
              site is a reference console, the product is the contract underneath.
            </p>
          </div>
          <div className="text-sm text-muted">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Network</p>
            <p className="mt-2">{CHAIN_NAME}</p>
            <p className="mt-1 font-mono text-xs">
              Contract:{" "}
              {CONTRACT_ADDRESS ? (
                <a
                  href={`${GENLAYER_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-judgement-cyan hover:underline"
                >
                  {CONTRACT_ADDRESS.slice(0, 10)}…
                </a>
              ) : (
                "not deployed yet"
              )}
            </p>
          </div>
          <div className="text-sm text-muted">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Resources</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/apps/register" className="hover:text-foreground">
                  Register an app
                </Link>
              </li>
              <li>
                <Link href="/cases/open" className="hover:text-foreground">
                  Open a demo case
                </Link>
              </li>
              <li>
                <a href={GENLAYER_EXPLORER_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  StudioNet explorer
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
