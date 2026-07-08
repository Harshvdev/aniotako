import SearchClient from "./SearchClient";
import SearchLoading from "./loading";
import { Suspense } from "react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search Anime",
  description: "Search and discover anime shows. Filter by genre, format, season, year, and airing status on Aniotako.",
  alternates: {
    canonical: "/search",
  },
};

export default async function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchClient />
    </Suspense>
  );
}
