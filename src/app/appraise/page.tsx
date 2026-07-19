import type { Metadata } from "next";
import { SearchHero } from "@/components/appraisal/search-hero";

export const metadata: Metadata = { title: "Appraise a domain" };

export default function AppraisePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Appraise a domain</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter any domain to get a full valuation with comparable sales.
      </p>
      <div className="mt-6">
        <SearchHero compact />
      </div>
    </div>
  );
}
