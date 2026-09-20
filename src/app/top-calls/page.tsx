import { getTopCalls } from "@/lib/data";
import { TopCallsTable } from "@/components/TopCallsTable";

export const dynamic = "force-dynamic";

export const metadata = { title: "Top calls — Trench Socials" };

export default async function TopCallsPage() {
  const calls = await getTopCalls(30);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-black tracking-tight">
          Top <span className="text-mint">calls</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          Ranked by how far the coin ran from the market cap it was called at. Live numbers.
        </p>
      </div>
      <TopCallsTable calls={calls} />
    </div>
  );
}
