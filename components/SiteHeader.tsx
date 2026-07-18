"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { SOLANA_CLUSTER } from "@/lib/solana/config";

// Wallet button is client-only; ssr:false avoids a hydration mismatch.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-[132px] rounded-[11px] card-2" /> },
);

const NAV = [
  { href: "/analyze", label: "Analyze" },
  { href: "/markets", label: "Markets" },
  { href: "/matchday", label: "Room" },
  { href: "/terminal", label: "Sentinel" },
  { href: "/verify", label: "Verify" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <EmoteLogo />
          <span className="text-lg font-black tracking-tight">
            Emote<span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="chip hidden sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {SOLANA_CLUSTER}
          </span>
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}

function EmoteLogo() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-accent glow-primary">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
        {/* face + pulse */}
        <circle cx="12" cy="12" r="9" stroke="#1a0f02" strokeWidth="2" />
        <path d="M8 14c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2" stroke="#1a0f02" strokeWidth="2" strokeLinecap="round" />
        <path d="M8.5 9.5h.01M15.5 9.5h.01" stroke="#1a0f02" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
