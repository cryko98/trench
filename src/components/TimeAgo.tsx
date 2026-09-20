"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

/** Relative timestamp that keeps ticking, without tripping hydration. */
export function TimeAgo({ ts, className = "" }: { ts: number; className?: string }) {
  const [label, setLabel] = useState(() => timeAgo(ts));

  useEffect(() => {
    const id = setInterval(() => setLabel(timeAgo(ts)), 30_000);
    return () => clearInterval(id);
  }, [ts]);

  return (
    <time
      dateTime={new Date(ts).toISOString()}
      title={new Date(ts).toLocaleString()}
      className={className}
      suppressHydrationWarning
    >
      {label}
    </time>
  );
}
