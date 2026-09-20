/* eslint-disable @next/next/no-img-element */
import type { Profile } from "@/lib/types";

const SIZES = { sm: 32, md: 40, lg: 72 } as const;

export function Avatar({
  profile,
  size = "md",
  className = "",
}: {
  profile: Pick<Profile, "wallet" | "name" | "avatar">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  const initials = (profile.name || profile.wallet).slice(0, 2).toUpperCase();

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full border border-line bg-surface-2 ${className}`}
      style={{ width: px, height: px }}
    >
      {profile.avatar ? (
        <img
          src={profile.avatar}
          alt={profile.name}
          width={px}
          height={px}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="tf-gradient-bg flex h-full w-full items-center justify-center font-bold text-black/80"
          style={{ fontSize: px / 2.8 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
