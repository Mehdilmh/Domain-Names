import type { Metadata } from "next";
import { APP_NAME, API_RATE_LIMIT } from "@/config/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "API docs" };

const curlExample = `curl -X POST https://your-domain.com/api/v1/appraise \\
  -H "Authorization: Bearer dp_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"domain": "cloudmind.io"}'`;

const responseExample = `{
  "domain": "cloudmind.io",
  "valuation": { "low": 4200, "mid": 6100, "high": 8800, "currency": "USD" },
  "confidence": 78,
  "months_to_sell": 9.4,
  "liquidity": 63,
  "category": "tech",
  "comparables": [
    { "domain": "cloudbank.io", "price": 7500, "soldAt": "2024-08-11T00:00:00Z", "similarity": 92.4 }
  ],
  "trademark": { "risk": false, "level": "none", "note": "No obvious conflicts." },
  "explanation": "cloudmind.io is a 9-character .io name…",
  "cached": false,
  "disclaimer": "Estimates are algorithmic opinions…"
}`;

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{APP_NAME} API</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Appraise domains programmatically. Authenticate with an API key from your dashboard. The full
        machine-readable spec is at{" "}
        <a href="/api/openapi" className="text-primary hover:underline">
          /api/openapi
        </a>
        .
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Pass your key as a bearer token: <code className="mono-num text-foreground">Authorization: Bearer dp_live_…</code>
          </p>
          <p>
            Rate limits (requests / {API_RATE_LIMIT.windowSeconds}s): Free {API_RATE_LIMIT.free}, Pro{" "}
            {API_RATE_LIMIT.pro}, Agency {API_RATE_LIMIT.agency}. Limit headers are returned on every
            response.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            <span className="mono-num">POST</span> /api/v1/appraise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Request</div>
            <CodeBlock>{curlExample}</CodeBlock>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Response</div>
            <CodeBlock>{responseExample}</CodeBlock>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Status codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {[
            ["200", "Success"],
            ["401", "Missing or invalid API key"],
            ["402", "Insufficient credits"],
            ["422", "Validation error"],
            ["429", "Rate limit exceeded"],
          ].map(([code, desc]) => (
            <div key={code} className="flex gap-3">
              <span className="mono-num w-10 text-foreground">{code}</span>
              <span>{desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs">
      <code className="mono-num text-foreground">{children}</code>
    </pre>
  );
}
