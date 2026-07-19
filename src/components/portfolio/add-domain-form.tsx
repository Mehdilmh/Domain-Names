"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { addPortfolioItem } from "@/server/actions/portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddDomainForm() {
  const [domain, setDomain] = useState("");
  const [renewalCost, setRenewalCost] = useState("12");
  const [renewsAt, setRenewsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addPortfolioItem({
        domain,
        renewalCost: Number(renewalCost),
        renewsAt: renewsAt || undefined,
      });
      if (!res.ok) setError(res.error ?? "Failed to add");
      else {
        setDomain("");
        setRenewsAt("");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="example.com"
        className="mono-num flex-1"
      />
      <Input
        value={renewalCost}
        onChange={(e) => setRenewalCost(e.target.value)}
        type="number"
        min={0}
        placeholder="Renewal $"
        className="mono-num sm:w-28"
        aria-label="Annual renewal cost"
      />
      <Input
        value={renewsAt}
        onChange={(e) => setRenewsAt(e.target.value)}
        type="date"
        className="sm:w-40"
        aria-label="Renewal date"
      />
      <Button type="submit" disabled={pending || !domain}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add
      </Button>
      {error && <p className="text-sm text-danger sm:hidden">{error}</p>}
    </form>
  );
}
