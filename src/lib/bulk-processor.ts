import { prisma } from "./db";
import { appraise } from "./valuation";
import { spendCredits } from "./credits";
import { CREDIT_COST } from "@/config/app";

/**
 * Process a queued bulk job: appraise each domain, update progress, and
 * assemble a downloadable CSV. Credits are charged per successfully
 * appraised row, transactionally. Shared by the BullMQ worker and the
 * in-memory fallback.
 */
export async function processBulkJob(jobId: string): Promise<void> {
  const job = await prisma.bulkJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  await prisma.bulkJob.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  const list: string[] = Array.isArray(job.inputDomains)
    ? (job.inputDomains as string[])
    : [];

  const header = "domain,low,mid,high,confidence,months_to_sell,liquidity,trademark_risk";
  const rows: string[] = [header];
  let processed = 0;

  for (const domain of list) {
    try {
      const result = await appraise(domain, { source: "bulk", skipComps: true });
      rows.push(
        [
          result.domain,
          result.low,
          result.mid,
          result.high,
          result.confidence,
          result.monthsToSell,
          result.liquidity,
          result.trademark.risk ? result.trademark.level : "none",
        ].join(","),
      );
      // charge one credit per appraised row
      try {
        await spendCredits(job.userId, CREDIT_COST.bulkAppraisalPerRow, "bulk", jobId);
      } catch {
        rows.push(`${domain},,,,,,,insufficient_credits`);
      }
    } catch (err) {
      rows.push(`${domain},error,,,,,,`);
    }
    processed++;
    if (processed % 25 === 0 || processed === list.length) {
      await prisma.bulkJob.update({
        where: { id: jobId },
        data: { processed },
      });
    }
  }

  await prisma.bulkJob.update({
    where: { id: jobId },
    data: { status: "done", processed, resultCsv: rows.join("\n") },
  });
}
