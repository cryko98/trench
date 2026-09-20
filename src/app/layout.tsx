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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Trench Socials — $TF",
  description:
    "The Solana trenches, in one feed. Connect your wallet, call coins with live market caps, and let the trenches reply.",
  openGraph: {
    title: "Trench Socials — $TF",
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
            Trench Socials · $TF · built on Solana · data by DexScreener &amp; pump.fun
          </footer>
        </Providers>
      </body>
    </html>
  );
}
