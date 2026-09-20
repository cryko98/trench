"use client";

import Link from "next/link";
import { useAuth } from "./AuthContext";

/** Points a freshly connected wallet at its own, still-default profile. */
export function ProfileNudge() {
  const { profile } = useAuth();
  if (!profile) return null;

  const usingDefaults =
    !profile.avatar || profile.handle === profile.wallet.slice(0, 6).toLowerCase();
  if (!usingDefaults) return null;

  return (
    <Link
      href="/settings"
      className="tf-card flex items-center gap-3 p-3 transition hover:border-mint/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint/10 text-mint">
        ✎
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-bold">Set up your profile</div>
        <div className="text-xs text-muted">
          Pick a name, a handle and a profile picture — it is tied to your wallet.
        </div>
      </div>
      <span className="tf-btn tf-btn-ghost">Edit</span>
    </Link>
  );
}
