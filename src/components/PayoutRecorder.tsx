"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Shown only to the treasury wallet. The transfer itself happens in that
 * wallet; this just records what was sent so the history is public.
 */
export function PayoutRecorder({
  epochStart,
  isAdmin,
}: {
  epochStart: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [sol, setSol] = useState("");
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sol: Number(sol), signature, epochStart }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not record");
      setSol("");
      setSignature("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tf-card p-4">
      <span className="tf-label">Record a payout</span>
      <p className="mt-2 text-xs text-muted">
        Send the SOL from the reward wallet first, then log it here so the history stays public.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={sol}
          onChange={(e) => setSol(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="SOL paid out"
          inputMode="decimal"
          className="tf-input sm:max-w-40"
        />
        <input
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Transaction signature (optional)"
          spellCheck={false}
          className="tf-input font-mono text-xs"
        />
        <button
          className="tf-btn tf-btn-primary"
          onClick={() => void submit()}
          disabled={busy || !Number(sol)}
        >
          {busy ? "Saving…" : "Record"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-loss">{error}</p>}
    </section>
  );
}
