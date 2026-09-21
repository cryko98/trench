import { getTopCallers, getTopCalls } from "@/lib/data";
import { TopCallsTable } from "@/components/TopCallsTable";
import { TopCallers } from "@/components/TopCallers";

export const dynamic = "force-dynamic";

export const metadata = { title: "Top calls — Trench Socials" };

export default async function TopCallsPage() {
  const [calls, callers] = await Promise.all([getTopCalls(30), getTopCallers(10)]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-black tracking-tight">
          Top <span className="text-mint">calls</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          Ranked by the peak market cap each coin reached after the call, with where it stands now.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <TopCallsTable calls={calls} />
        </div>
        <div className="min-w-0 lg:sticky lg:top-[4.5rem] lg:self-start">
          <TopCallers callers={callers} />
        </div>
      </div>
    </div>
  );
}
