import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-mint text-5xl font-black">404</h1>
      <p className="mt-3 text-sm text-muted">
        Nothing in this trench. The post, profile or coin does not exist.
      </p>
      <Link href="/" className="tf-btn tf-btn-primary mt-6">
        Back to the feed
      </Link>
    </div>
  );
}
