import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a price in USD, whole dollars. Rendered in mono + tabular-nums in UI. */
export function formatPrice(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** Compact price for tight spaces: $1.2K, $45K, $1.1M. */
export function formatPriceCompact(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return "$" + Math.round(n);
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function daysUntil(d: string | Date): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
