import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Plus_Jakarta_Sans, Playfair_Display, Outfit, JetBrains_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aniotako.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aniotako - Personal Anime Watchlist Tracker & Airing Scheduler",
    template: "%s | Aniotako"
  },
  description: "Create your personal anime watchlist, check airing countdowns, and get real-time desktop push notifications for upcoming episodes in your local timezone.",
  keywords: ["anime", "watchlist", "anime tracker", "airing schedule", "anime countdown", "push notifications", "MAL import", "AniList"],
  authors: [{ name: "Aniotako Team" }],
  creator: "Aniotako",
  publisher: "Aniotako",
  alternates: {
    canonical: "./",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Aniotako",
    title: "Aniotako - Personal Anime Watchlist Tracker & Airing Scheduler",
    description: "Create your personal anime watchlist, check airing countdowns, and get real-time desktop push notifications for upcoming episodes in your local timezone.",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Aniotako Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aniotako - Personal Anime Watchlist Tracker & Airing Scheduler",
    description: "Create your personal anime watchlist, check airing countdowns, and get real-time desktop push notifications for upcoming episodes in your local timezone.",
    images: ["/icon-512.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${plusJakartaSans.variable} ${playfairDisplay.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader showSpinner={false} height={3} />
        {children}
      </body>
    </html>
  );
}