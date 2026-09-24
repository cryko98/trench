import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionWallet } from "@/lib/auth";
import { limited } from "@/lib/ratelimit";
import { fundedOr403 } from "@/lib/holdings";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * The type a browser reports is whatever the client says it is. The first
 * bytes of the file are not: every accepted format opens with a signature.
 */
function sniff(bytes: Uint8Array): string | null {
  const hex = (n: number) => [...bytes.slice(0, n)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex(8) === "89504e470d0a1a0a") return "image/png";
  if (hex(3) === "ffd8ff") return "image/jpeg";
  if (hex(6) === "474946383761" || hex(6) === "474946383961") return "image/gif";
  if (hex(4) === "52494646" && hex(12).endsWith("57454250")) return "image/webp";
  return null;
}

/** Stores a post image and hands back its public URL. */
export async function POST(req: Request) {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  // Storage costs; a wallet gets a handful of uploads a minute and must be funded.
  const block = await limited("upload", wallet, 10, 60);
  if (block) return block;
  const unfunded = await fundedOr403(wallet);
  if (unfunded) return unfunded;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Image uploads are not configured on this deployment" },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Images only (jpg, png, webp, gif)" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is larger than 4MB" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const actual = sniff(bytes);
  if (!actual || actual !== file.type) {
    return NextResponse.json({ error: "That file is not the image it claims to be" }, { status: 415 });
  }

  const extension = actual.split("/")[1].replace("jpeg", "jpg");
  const blob = await put(`posts/${wallet}-${Date.now()}.${extension}`, Buffer.from(bytes), {
    access: "public",
    addRandomSuffix: true,
    contentType: actual,
  });

  return NextResponse.json({ url: blob.url });
}
