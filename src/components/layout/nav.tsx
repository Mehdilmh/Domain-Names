import Link from "next/link";
import { APP_NAME } from "@/config/app";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/appraise", label: "Appraise" },
  { href: "/bulk", label: "Bulk" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/accuracy", label: "Accuracy" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs/api", label: "API" },
];

export async function Nav() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
          <span className="font-heading text-base font-semibold tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/portfolio">
              <Button variant="ghost" size="sm">
                {user.name ?? user.email}
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
