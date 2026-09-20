import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionWallet } from "@/lib/auth";
import { getComments, getPost } from "@/lib/data";
import { PostCard } from "@/components/PostCard";
import { CommentSection } from "@/components/CommentSection";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: PageProps<"/post/[id]">) {
  const { id } = await params;
  const viewer = await getSessionWallet();
  const post = await getPost(id, viewer);
  if (!post) notFound();

  const comments = await getComments(id);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link href="/" className="text-sm text-muted transition hover:text-foreground">
        ← Back to feed
      </Link>
      <PostCard post={post} clickable={false} />
      <CommentSection postId={id} initialComments={comments} />
    </div>
  );
}
