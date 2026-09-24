import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

// Chunky rounded display type for headings, warm and round for reading.
const display = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Canonical origin for social tags: the custom domain in production. */
function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

// Draw under the phone's home bar too, or the browser reports its height as
// zero and the bottom tabs cannot be told to clear it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Trench Socials — $socials",
  description:
    "The Solana trenches, in one feed. Connect your wallet, call coins with live market caps, and let the trenches reply.",
  twitter: {
    card: "summary_large_image",
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Trench Socials — $socials",
    description: "Call coins. Track market caps. Talk trenches.",
    type: "website",
    url: siteUrl(),
    siteName: "Trench Socials",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
          </main>
          <MobileNav />
          <footer className="border-t-2 border-ink/10 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 text-center text-xs text-muted lg:pb-6">
            Trench Socials · $socials · built on Solana · data by DexScreener &amp; pump.fun
          </footer>
        </Providers>
      </body>
    </html>
  );
}
