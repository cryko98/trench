import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionWallet } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Stores a post image and hands back its public URL. */
export async function POST(req: Request) {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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

  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const blob = await put(`posts/${wallet}-${Date.now()}.${extension}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
