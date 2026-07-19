"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { appraise } from "@/lib/valuation";
import { spendCredits, InsufficientCreditsError } from "@/lib/credits";
import { CREDIT_COST } from "@/config/app";
import { appraiseInputSchema } from "@/schemas/appraise";
import { prisma } from "@/lib/db";
import type { AppraisalResult } from "@/lib/valuation/types";

export type AppraiseActionResult =
  | { ok: true; result: AppraisalResult; creditsLeft: number | null }
  | { ok: false; error: string; code?: "auth" | "credits" | "validation" };

/**
 * Server action for a single appraisal from the web UI.
 * Deducts one credit inside a transaction — only if the appraisal is
 * freshly computed (cache hits are free). Never optimistic.
 */
export async function appraiseAction(input: unknown): Promise<AppraiseActionResult> {
  const parsed = appraiseInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input", code: "validation" };
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return { ok: false, error: "Please sign in to appraise domains.", code: "auth" };
  }

  // Compute first; charge only for a fresh computation.
  const result = await appraise(parsed.data.domain, { source: "web", fresh: parsed.data.fresh });

  let creditsLeft: number | null = null;
  if (!result.cached) {
    try {
      creditsLeft = await spendCredits(userId, CREDIT_COST.singleAppraisal, "appraisal", result.domain);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return { ok: false, error: "You're out of credits. Upgrade or buy a credit pack.", code: "credits" };
      }
      throw err;
    }
    // persist the appraisal record for history
    await prisma.appraisal.create({
      data: {
        domain: result.domain,
        userId,
        low: result.low,
        mid: result.mid,
        high: result.high,
        confidence: result.confidence,
        monthsToSell: result.monthsToSell,
        liquidity: result.liquidity,
        features: result.features as object,
        comps: result.comps as object,
        explanation: result.explanation,
        trademark: result.trademark as object,
        source: "web",
      },
    });
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    creditsLeft = user?.credits ?? null;
  }

  revalidatePath("/appraise");
  return { ok: true, result, creditsLeft };
}
