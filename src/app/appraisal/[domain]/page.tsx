import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { appraise } from "@/lib/valuation";
import { splitDomain } from "@/lib/valuation/features";
import { domainSchema } from "@/schemas/appraise";
import { auth } from "@/lib/auth";
import { AppraisalReport } from "@/components/appraisal/appraisal-report";
import { formatPrice } from "@/lib/utils";
import { APP_NAME } from "@/config/app";

export const revalidate = 86400; // static-ish: regenerate daily

interface Props {
  params: Promise<{ domain: string }>;
}

function safeDomain(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  const { domain } = splitDomain(decoded);
  return domainSchema.safeParse(domain).success ? domain : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain: raw } = await params;
  const domain = safeDomain(raw);
  if (!domain) return { title: "Domain appraisal" };

  const result = await appraise(domain, { source: "web", skipComps: true }).catch(() => null);
  const title = `${domain} appraisal — estimated value ${result ? formatPrice(result.mid) : ""}`;
  const description = result
    ? `${domain} is estimated at ${formatPrice(result.low)}–${formatPrice(result.high)} with ${result.confidence}% confidence. See comparable sales and the full valuation on ${APP_NAME}.`
    : `Estimate the value of ${domain} on ${APP_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: `/appraisal/${domain}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function AppraisalSeoPage({ params }: Props) {
  const { domain: raw } = await params;
  const domain = safeDomain(raw);
  if (!domain) notFound();

  const result = await appraise(domain, { source: "web" }).catch(() => null);
  if (!result) notFound();

  const session = await auth();
  const isPreview = !session?.user;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${domain} domain name`,
    description: `AI-estimated valuation for the domain ${domain}.`,
    category: result.features.category,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: result.low,
      highPrice: result.high,
      offerCount: result.comps.length,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {APP_NAME}
        </Link>{" "}
        / appraisal / <span className="mono-num text-foreground">{domain}</span>
      </nav>

      <h1 className="text-2xl font-semibold">
        How much is <span className="mono-num text-primary">{domain}</span> worth?
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        An AI-generated estimate based on {result.features.length} characters, the .
        {result.features.tld} extension, keyword demand, and comparable historical sales.
      </p>

      {isPreview && (
        <div className="mt-4 rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3 text-sm text-secondary">
          You&apos;re viewing a free preview.{" "}
          <Link href="/login" className="font-medium underline">
            Sign in
          </Link>{" "}
          to unlock the feature breakdown and full comparable sales.
        </div>
      )}

      <div className="mt-6">
        <AppraisalReport result={result} preview={isPreview} />
      </div>
    </div>
  );
}
