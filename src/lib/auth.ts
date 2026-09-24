import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "tf_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET || "trench-socials-dev-secret-change-me-please-0000";
  return new TextEncoder().encode(s);
}

export async function createSession(wallet: string) {
  const token = await new SignJWT({ wallet })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The one wallet allowed to moderate: remove anyone's post, record payouts. */
export function isAdminWallet(wallet: string | null | undefined): boolean {
  const admin = process.env.ADMIN_WALLET;
  return Boolean(admin) && wallet === admin;
}

/** Wallet address of the signed-in user, or null. */
export async function getSessionWallet(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.wallet === "string" ? payload.wallet : null;
  } catch {
    return null;
  }
}
