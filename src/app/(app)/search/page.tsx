import SearchClient from "./SearchClient";
import SearchLoading from "./loading";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchClient />
    </Suspense>
  );
}
