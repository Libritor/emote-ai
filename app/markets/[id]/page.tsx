import Link from "next/link";
import MarketDetail from "@/components/MarketDetail";

export default async function MarketPage({ params }: PageProps<"/markets/[id]">) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <Link href="/markets" className="mb-4 inline-block text-sm text-muted hover:text-ink">
        ← All markets
      </Link>
      <MarketDetail id={Number(id)} />
    </main>
  );
}
