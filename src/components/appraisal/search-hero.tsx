"use client";

import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { appraiseAction, type AppraiseActionResult } from "@/server/actions/appraise";
import { AppraisalReport } from "./appraisal-report";
import { Button } from "@/components/ui/button";

export function SearchHero({ compact = false }: { compact?: boolean }) {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<AppraiseActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    startTransition(async () => {
      const res = await appraiseAction({ domain });
      setResult(res);
    });
  }

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="relative z-10 mx-auto flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter a domain, e.g. cloudmind.io"
            className="mono-num h-12 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-base text-foreground placeholder:font-sans placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appraise"}
        </Button>
      </form>

      {result && !result.ok && (
        <div className="mx-auto mt-4 max-w-xl">
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {result.error}
            {result.code === "auth" && (
              <a href="/login" className="ml-2 font-medium underline">
                Sign in
              </a>
            )}
            {result.code === "credits" && (
              <a href="/pricing" className="ml-2 font-medium underline">
                Get credits
              </a>
            )}
          </div>
        </div>
      )}

      {result && result.ok && (
        <div className={compact ? "mt-6" : "mx-auto mt-8 max-w-3xl"}>
          {(result.unlimited || result.creditsLeft !== null) && (
            <p className="mb-3 text-center text-xs text-muted-foreground">
              {result.result.cached ? "Served from cache (no credit used) · " : ""}
              {result.unlimited ? (
                <span className="text-primary">Unlimited credits (admin)</span>
              ) : (
                <>{result.creditsLeft} credits remaining</>
              )}
            </p>
          )}
          <AppraisalReport result={result.result} />
        </div>
      )}
    </div>
  );
}
