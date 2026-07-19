import { NextRequest, NextResponse } from "next/server";
import { apiAppraiseSchema } from "@/schemas/api";
import { resolveApiKey } from "@/lib/apikeys";
import { rateLimit, limitForTier } from "@/lib/ratelimit";
import { spendCredits, InsufficientCreditsError } from "@/lib/credits";
import { appraise } from "@/lib/valuation";
import { CREDIT_COST } from "@/config/app";

export const runtime = "nodejs";

/**
 * POST /api/v1/appraise
 * Auth: Authorization: Bearer dp_live_...
 * Body: { "domain": "example.com" }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Missing API key. Send 'Authorization: Bearer dp_live_...'." },
      { status: 401 },
    );
  }

  const apiKey = await resolveApiKey(token);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  // Per-key rate limit.
  const limit = limitForTier(apiKey.tier);
  const rl = await rateLimit(`apikey:${apiKey.id}`, limit);
  const headers = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(rl.resetSeconds),
  };
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429, headers },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers });
  }

  const parsed = apiAppraiseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", details: parsed.error.issues },
      { status: 422, headers },
    );
  }

  const result = await appraise(parsed.data.domain, { source: "api" });

  // Charge one credit per fresh appraisal (cache hits are free).
  if (!result.cached) {
    try {
      await spendCredits(apiKey.userId, CREDIT_COST.apiAppraisal, "api", apiKey.id);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: "Insufficient credits on the account for this API key." },
          { status: 402, headers },
        );
      }
      throw err;
    }
  }

  return NextResponse.json(
    {
      domain: result.domain,
      valuation: {
        low: result.low,
        mid: result.mid,
        high: result.high,
        currency: "USD",
      },
      confidence: result.confidence,
      months_to_sell: result.monthsToSell,
      liquidity: result.liquidity,
      category: result.features.category,
      comparables: result.comps,
      trademark: result.trademark,
      explanation: result.explanation,
      cached: result.cached,
      disclaimer: result.disclaimer,
      generated_at: result.generatedAt,
    },
    { status: 200, headers },
  );
}

export function GET() {
  return NextResponse.json(
    { error: "Use POST with a JSON body { domain }." },
    { status: 405 },
  );
}
