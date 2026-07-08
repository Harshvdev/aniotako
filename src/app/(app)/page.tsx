import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aniotako - Personal Anime Watchlist Tracker & Airing Scheduler",
  description: "Create your personal anime watchlist, check airing countdowns, and get real-time desktop push notifications for upcoming episodes in your local timezone.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Aniotako",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "All",
    "description": "Aniotako is a high-performance personal anime watchlist tracker and scheduling web app. Users can manage watching progress, track localized episode airing countdowns, and subscribe to push notifications.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Anime Watchlist Tracker",
      "Live Airing Countdowns",
      "Real-time Browser Push Notifications",
      "MyAnimeList XML Watchlist Import",
      "AniList & Jikan Integration",
      "Local Timezone Scheduler"
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
