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
      className="tf-card tf-card-hover flex items-center gap-3 p-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun text-ink">
        ✎
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-bold">Make yourself at home</div>
        <div className="text-xs text-muted">
          Add a name, a handle and a picture so people know who is calling.
        </div>
      </div>
      <span className="tf-btn tf-btn-ghost">Edit</span>
    </Link>
  );
}
