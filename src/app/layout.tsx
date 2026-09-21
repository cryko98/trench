import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Canonical origin for social tags: the custom domain in production. */
function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(//$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Trench Socials — $socials",
  description:
    "The Solana trenches, in one feed. Connect your wallet, call coins with live market caps, and let the trenches reply.",
  twitter: {
    card: "summary_large_image",
  },
  openGraph: {
    title: "Trench Socials — $socials",
    description: "Call coins. Track market caps. Talk trenches.",
    type: "website",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line py-6 text-center text-xs text-muted">
            Trench Socials · $socials · built on Solana · data by DexScreener &amp; pump.fun
          </footer>
        </Providers>
      </body>
    </html>
  );
}
