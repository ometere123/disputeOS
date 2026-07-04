import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "./wallet-button";

const NAV = [
  { href: "/apps", label: "Apps" },
  { href: "/cases", label: "Cases" },
  { href: "/profile", label: "Profile" },
  { href: "/admin/protocol", label: "Protocol" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-void-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/disputeos-mark.svg"
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
          />
          <span className="font-display text-lg font-semibold tracking-tight">
            Dispute<span className="text-judgement-cyan">OS</span>
          </span>
          <span className="hidden rounded-full border border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted sm:inline">
            Reference Console
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 font-display text-sm text-muted transition-colors hover:bg-panel-ash hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}
