import Link from "next/link";

export default function SiteFooter() {
  const year: number = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-6 text-sm text-faint sm:px-6">
        <span>© {year} Emote AI</span>
        <span>TxODDS × Solana World Cup prototype</span>
        <span>Devnet only</span>
        <Link href="/wiki" className="hover:text-ink">
          Wiki · methods &amp; research
        </Link>
      </div>
    </footer>
  );
}
