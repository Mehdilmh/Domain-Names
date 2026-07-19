import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PortfolioTable, type PortfolioRow } from "@/components/portfolio/portfolio-table";
import { AddDomainForm } from "@/components/portfolio/add-domain-form";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const portfolio = await prisma.portfolio.findFirst({
    where: { userId },
    include: { items: true },
  });

  const rows: PortfolioRow[] = (portfolio?.items ?? []).map((i) => ({
    id: i.id,
    domain: i.domain,
    renewalCost: i.renewalCost,
    renewsAt: i.renewsAt?.toISOString() ?? null,
    estValue: i.estValue,
    lastAppraised: i.lastAppraised?.toISOString() ?? null,
  }));

  const totalValue = rows.reduce((s, r) => s + (r.estValue ?? 0), 0);
  const totalRenewal = rows.reduce((s, r) => s + r.renewalCost, 0);
  const keepCount = rows.filter((r) => (r.estValue ?? 0) / (r.renewalCost || 1) >= 10).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Portfolio</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track renewal dates, total value, and keep/drop recommendations.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Domains" value={String(rows.length)} />
        <Stat label="Total value" value={formatPrice(totalValue)} tone="text-primary" />
        <Stat label="Annual renewals" value={formatPrice(totalRenewal)} tone="text-secondary" />
        <Stat label="Recommended keeps" value={`${keepCount}/${rows.length}`} />
      </div>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <AddDomainForm />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-5">
          <PortfolioTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mono-num mt-1 text-xl font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}
