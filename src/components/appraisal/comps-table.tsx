import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Comp } from "@/lib/valuation/types";

/** Comparable sales — the transparency layer. Never a bare number. */
export function CompsTable({ comps }: { comps: Comp[] }) {
  if (!comps.length) {
    return <p className="text-sm text-muted-foreground">No comparable sales available.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Domain</TableHead>
          <TableHead>Sold</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Similarity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comps.map((c) => (
          <TableRow key={c.domain}>
            <TableCell className="mono-num font-medium text-foreground">{c.domain}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(c.soldAt)}</TableCell>
            <TableCell className="mono-num text-right text-foreground">{formatPrice(c.price)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <div className="hidden h-1.5 w-16 rounded-full bg-background sm:block">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, c.similarity)}%` }}
                  />
                </div>
                <span className="mono-num text-xs text-muted-foreground">{c.similarity}%</span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
