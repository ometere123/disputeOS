import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  ScanSearch,
  Gavel,
  ShieldAlert,
  Coins,
  Blocks,
  Puzzle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReusableContractPanel } from "@/components/dispute/reusable-contract-panel";
import { IntegrationSnippet } from "@/components/dispute/integration-snippet";
import { ConsensusTrace } from "@/components/dispute/consensus-trace";
import { CHAIN_NAME } from "@/lib/genlayer/config";

const CUSTOMERS = [
  "Marketplace",
  "SaaS App",
  "Escrow Platform",
  "Bounty Platform",
  "Creator Platform",
  "AI Agent Platform",
  "DAO Tool",
  "P2P Wager App",
  "Service Booking App",
  "Paid Community",
];

const DEMO_VERDICT = {
  case_id: 1,
  verdict: "split_settlement" as const,
  winner: "split" as const,
  complainant_bps: 6000,
  respondent_bps: 4000,
  confidence: 81,
  evidence_alignment: "strong" as const,
  rule_fit: "partial" as const,
  appeal_allowed: true,
  reason_code: "partial_delivery_supported",
  short_reason:
    "Evidence supports delivery of some requirements, but the contact form issue prevents full respondent win.",
  issued_at: Math.floor(Date.now() / 1000),
};

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mx-auto">
            Reusable Intelligent Contract · {CHAIN_NAME}
          </Badge>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-6xl">
            Every app eventually has conflict.
            <br />
            <span className="text-judgement-cyan">DisputeOS</span> gives it a judgement layer.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            A reusable GenLayer Intelligent Contract for apps that need evidence intake, validator
            interpretation, appeals, and settlement instructions without building their own
            court.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/cases">
                View Contract Console <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="amber">
              <Link href="/apps/register">Register Demo App</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/cases/open">Open Demo Case</Link>
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-3xl">
          <ReusableContractPanel />
        </div>
      </section>

      {/* Why apps need dispute infrastructure */}
      <Section
        eyebrow="Why apps need dispute infrastructure"
        title="Disputr is one courtroom. DisputeOS is the court engine."
      >
        <p className="max-w-3xl text-muted">
          Every marketplace, escrow product, bounty platform, or agent network eventually has a
          user who disagrees with another user, or with the platform itself. Building a fair
          arbitration system from scratch means building evidence intake, a judgement process, an
          appeal path, and a settlement engine. DisputeOS is that layer, built once, reusable by
          any app.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {CUSTOMERS.map((c) => (
            <Badge key={c} variant="muted">
              {c}
            </Badge>
          ))}
        </div>
      </Section>

      {/* Reusable Intelligent Contract architecture */}
      <Section
        eyebrow="Reusable Intelligent Contract architecture"
        title="One contract. Many apps. Many case types."
      >
        <div className="grid gap-6 md:grid-cols-3">
          <ArchCard
            icon={<Blocks className="h-5 w-5" />}
            title="Register your app"
            body="Any app registers itself once on DisputeOSProtocol, no fork and no redeploy."
          />
          <ArchCard
            icon={<Puzzle className="h-5 w-5" />}
            title="Define a template"
            body="Rules, required evidence, allowed verdicts, settlement mode, and appeal window, all app-defined."
          />
          <ArchCard
            icon={<Gavel className="h-5 w-5" />}
            title="Open cases"
            body="Every disagreement becomes a structured Dispute Packet the contract already knows how to judge."
          />
        </div>
      </Section>

      {/* The Dispute Packet */}
      <Section eyebrow="The Dispute Packet" title="Every disagreement becomes the same shape.">
        <div className="grid gap-8 lg:grid-cols-2">
          <p className="text-muted">
            App identity, template, case type, parties, rules, claims, evidence, requested remedy,
            allowed outcomes, settlement mode, and appeal rules, packaged into one object. This is
            what makes the underlying contract reusable across completely different apps: a
            freelance delivery dispute and a DAO contributor reward dispute are both just Dispute
            Packets with different rules.
          </p>
          <IntegrationSnippet />
        </div>
      </Section>

      {/* Evidence intake */}
      <Section eyebrow="How evidence intake works" title="Evidence in, verdict out.">
        <div className="grid gap-4 sm:grid-cols-3">
          <StepCard n={1} title="Fund the case" body="The complainant escrows GEN, opening the evidence window." />
          <StepCard n={2} title="Both sides submit" body="Complainant and respondent each attach up to 8 evidence items with public URLs." />
          <StepCard n={3} title="Evidence closes" body="Either party, the app owner, or anyone after the deadline can close the window." />
        </div>
      </Section>

      {/* GenLayer validator interpretation */}
      <Section
        eyebrow="GenLayer validator interpretation"
        title="Validators read the packet. Not a backend. Not a frontend script."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 text-muted">
            <p>
              <span className="text-foreground">request_verdict(case_id)</span> is the core
              GenLayer moment. Validators independently interpret the template rules, both
              parties&apos; claims, every evidence item, and the requested remedy, then return
              compact canonical JSON, never a long unstructured essay.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <ScanSearch className="h-4 w-4 text-judgement-cyan" />
              Leader proposes a verdict. Validators independently re-derive one and compare.
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-judgement-cyan" />
              No fake AI judge in the frontend. No backend arbitration. Only the chain decides.
            </div>
          </div>
          <ConsensusTrace verdict={DEMO_VERDICT} />
        </div>
      </Section>

      {/* Equivalence Principle settlement */}
      <Section
        eyebrow="Equivalence Principle settlement"
        title="Disputes are subjective. Consensus doesn't require identical wording."
      >
        <p className="max-w-3xl text-muted">
          Two validators rarely phrase a verdict the same way, and their settlement splits may
          differ by a few points. DisputeOS normalizes outputs into settlement bands (0/100,
          25/75, 50/50, 75/25, 100/0), confidence bands, and category labels, then requires
          agreement on meaning, not on exact text. Strict equality is reserved for deterministic
          fields: case IDs, addresses, stored statuses, and normalized labels.
        </p>
      </Section>

      {/* Appeals without chaos */}
      <Section eyebrow="Appeals without chaos" title="An appeal must argue something new.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-appeal-purple" />
              <p className="text-sm text-muted">
                Appeals require a structured basis: new evidence, a misread rule, a misread
                timeline, a disproportionate settlement, or a party/identity error. A second
                validator review evaluates whether that basis actually changes the outcome.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-sm text-muted">
              After appeal review, the case becomes final: one appeal per case, one clean
              resolution, no infinite re-litigation loop.
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* GEN escrow and external settlement */}
      <Section
        eyebrow="GEN escrow and external settlement modes"
        title="The contract moves real GEN or hands the app a settlement instruction."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <ArchCard
            icon={<Coins className="h-5 w-5" />}
            title="GEN escrow settlement (MVP)"
            body="The case is funded, GEN is locked in DisputeOSProtocol, and the final verdict's basis-point split pays complainant and respondent directly on claim_settlement()."
          />
          <ArchCard
            icon={<Blocks className="h-5 w-5" />}
            title="External settlement instruction (future B2B mode)"
            body="Apps that don't want DisputeOS holding funds can read the canonical verdict as an instruction, for example refund_70_percent_to_buyer, and settle on their own ledger."
          />
        </div>
      </Section>

      {/* Future SDK direction */}
      <Section eyebrow="Future SDK direction" title="This console shows what an SDK will later automate.">
        <p className="max-w-3xl text-muted">
          A future <code className="rounded bg-panel-ash px-1.5 py-0.5 font-mono text-sm">@disputeos/sdk</code>{" "}
          would wrap these same contract calls: <code className="font-mono">openCase</code>,{" "}
          <code className="font-mono">submitEvidence</code>, and <code className="font-mono">getVerdict</code>,
          and an embeddable <code className="font-mono">&lt;dispute-os-case /&gt;</code> widget would let any
          app drop in a case room without building one. The reference console you&apos;re using now
          is a preview of that integration surface.
        </p>
      </Section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <p className="font-display text-xl font-semibold sm:text-2xl">
            The dashboard is only the reference console.
            <br />
            The product is the reusable dispute contract underneath.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/apps">
                Explore Registered Apps <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/cases">Open the Case Board</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-judgement-cyan">{eyebrow}</p>
        <h2 className="mt-2 max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function ArchCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-judgement-cyan/40 bg-judgement-cyan/10 text-judgement-cyan">
        {icon}
      </div>
      <p className="mt-3 font-display font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-muted">{body}</p>
    </Card>
  );
}

function StepCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <Card className="p-5">
      <span className="font-mono text-2xl font-bold text-judgement-cyan/40">
        {String(n).padStart(2, "0")}
      </span>
      <p className="mt-2 font-display font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-muted">{body}</p>
    </Card>
  );
}
