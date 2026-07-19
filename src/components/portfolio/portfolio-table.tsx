"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate, daysUntil } from "@/lib/utils";
import { removePortfolioItem } from "@/server/actions/portfolio";

export interface PortfolioRow {
  id: string;
  domain: string;
  renewalCost: number;
  renewsAt: string | null;
  estValue: number | null;
  lastAppraised: string | null;
}

type SortKey = "domain" | "estValue" | "renewalCost" | "renewsAt" | "roi";

/** Keep/drop heuristic: drop when est value is below ~10x annual renewal. */
function recommendation(row: PortfolioRow): { keep: boolean; ratio: number } {
  const value = row.estValue ?? 0;
  const cost = row.renewalCost || 1;
  const ratio = value / cost;
  return { keep: ratio >= 10, ratio };
}

export function PortfolioTable({ rows }: { rows: PortfolioRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("estValue");
  const [asc, setAsc] = useState(false);
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case "domain":
          av = a.domain;
          bv = b.domain;
          break;
        case "renewalCost":
          av = a.renewalCost;
          bv = b.renewalCost;
          break;
        case "renewsAt":
          av = a.renewsAt ? new Date(a.renewsAt).getTime() : Infinity;
          bv = b.renewsAt ? new Date(b.renewsAt).getTime() : Infinity;
          break;
        case "roi":
          av = recommendation(a).ratio;
          bv = recommendation(b).ratio;
          break;
        default:
          av = a.estValue ?? 0;
          bv = b.estValue ?? 0;
      }
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  function Header({ k, label, className }: { k: SortKey; label: string; className?: string }) {
    return (
      <TableHead className={className}>
        <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
          {label}
          <ArrowUpDown className="h-3 w-3" />
        </button>
      </TableHead>
    );
  }

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No domains yet. Add one above to start tracking.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <Header k="domain" label="Domain" />
          <Header k="estValue" label="Est. value" className="text-right" />
          <Header k="renewalCost" label="Renewal" className="text-right" />
          <Header k="renewsAt" label="Renews" />
          <Header k="roi" label="Value / cost" className="text-right" />
          <TableHead className="text-right">Rec.</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => {
          const rec = recommendation(row);
          const soon = row.renewsAt && daysUntil(row.renewsAt) <= 30;
          return (
            <TableRow key={row.id}>
              <TableCell className="mono-num font-medium text-foreground">{row.domain}</TableCell>
              <TableCell className="mono-num text-right">
                {row.estValue ? formatPrice(row.estValue) : "—"}
              </TableCell>
              <TableCell className="mono-num text-right text-muted-foreground">
                {formatPrice(row.renewalCost)}
              </TableCell>
              <TableCell className={soon ? "text-secondary" : "text-muted-foreground"}>
                {row.renewsAt ? `${formatDate(row.renewsAt)}${soon ? " ⚠" : ""}` : "—"}
              </TableCell>
              <TableCell className="mono-num text-right text-muted-foreground">
                {rec.ratio ? `${rec.ratio.toFixed(0)}×` : "—"}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={rec.keep ? "default" : "danger"}>{rec.keep ? "Keep" : "Drop"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <button
                  className="text-muted-foreground hover:text-danger disabled:opacity-50"
                  disabled={pending}
                  onClick={() => startTransition(() => void removePortfolioItem({ id: row.id }))}
                  aria-label={`Remove ${row.domain}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
