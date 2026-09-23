"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { Avatar } from "./Avatar";
import { shortAddress } from "@/lib/format";
import type { Profile } from "@/lib/types";

const AVATAR_PX = 256;

/** Downscale a picked image in the browser so it fits in a single Redis value. */
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not an image"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_PX;
        canvas.height = AVATAR_PX;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not available"));
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_PX,
          AVATAR_PX
        );
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileForm() {
  const router = useRouter();
  const { profile, setProfile, loading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name ?? "");
  const [handle, setHandle] = useState(profile?.handle ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (loading) return <div className="tf-card h-64 animate-pulse" />;

  if (!profile) {
    return (
      <div className="tf-card p-8 text-center">
        <h1 className="text-lg font-bold">Connect your wallet</h1>
        <p className="mt-1 text-sm text-muted">Your profile lives behind your Solana wallet.</p>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, handle, bio, avatar }),
      });
      const json = (await res.json()) as { profile?: Profile; error?: string };
      if (!res.ok || !json.profile) throw new Error(json.error ?? "Could not save");
      setProfile(json.profile);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setAvatar(await resizeToDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that image");
    }
  };

  return (
    <div className="tf-card space-y-5 p-5">
      <div>
        <h1 className="text-lg font-bold">Your profile</h1>
        <p className="mt-0.5 font-mono text-xs text-muted">{shortAddress(profile.wallet, 8)}</p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar profile={{ ...profile, avatar, name }} size="lg" />
        <div className="flex flex-wrap gap-2">
          <button className="tf-btn tf-btn-ghost" onClick={() => fileRef.current?.click()}>
            Upload picture
          </button>
          {avatar && (
            <button className="tf-btn tf-btn-ghost" onClick={() => setAvatar("")}>
              Remove
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void pickFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Or image URL
        </span>
        <input
          value={avatar.startsWith("data:") ? "" : avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://…"
          className="tf-input text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Display name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 32))}
          placeholder="Trench Goblin"
          className="tf-input"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Handle
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="degen420"
            className="tf-input"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
          Bio
        </span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          rows={3}
          placeholder="Full-time trencher. Not financial advice."
          className="tf-input resize-none"
        />
      </label>

      {error && <p className="text-sm text-loss">{error}</p>}
      {saved && <p className="text-sm text-mint-deep">Saved.</p>}

      <div className="flex justify-end">
        <button className="tf-btn tf-btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
