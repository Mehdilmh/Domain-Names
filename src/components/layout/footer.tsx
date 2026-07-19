import Link from "next/link";
import { APP_NAME, APPRAISAL_DISCLAIMER } from "@/config/app";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
              <span className="font-heading font-semibold">{APP_NAME}</span>
            </div>
            <p className="mt-2 max-w-md text-xs text-muted-foreground">{APPRAISAL_DISCLAIMER}</p>
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/accuracy" className="hover:text-foreground">Accuracy</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/docs/api" className="hover:text-foreground">API</Link>
          </nav>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Estimates are opinions, not financial advice.
        </p>
      </div>
    </footer>
  );
}
