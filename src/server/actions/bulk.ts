"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enqueueBulkJob } from "@/lib/queue";
import { bulkInputSchema, parseDomainCsv } from "@/schemas/bulk";

export type BulkActionResult =
  | { ok: true; jobId: string; total: number }
  | { ok: false; error: string };

/** Accept a CSV blob, validate, create a queued bulk job, and dispatch it. */
export async function startBulkAppraisal(csv: string): Promise<BulkActionResult> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Please sign in to run bulk appraisals." };

  const domains = parseDomainCsv(csv);
  const parsed = bulkInputSchema.safeParse({ domains });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid CSV" };
  }

  const job = await prisma.bulkJob.create({
    data: {
      userId,
      total: parsed.data.domains.length,
      inputDomains: parsed.data.domains,
      status: "queued",
    },
  });

  await enqueueBulkJob(job.id);
  return { ok: true, jobId: job.id, total: job.total };
}
