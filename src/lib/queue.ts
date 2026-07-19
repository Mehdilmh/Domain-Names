import { getRedisClient } from "./redis";
import { processBulkJob } from "./bulk-processor";

/**
 * Bulk job dispatch. Uses BullMQ when REDIS_URL is set; otherwise falls
 * back to processing the job in-process (fire-and-forget) so bulk uploads
 * still work with zero infra.
 */
export const BULK_QUEUE_NAME = "bulk-appraisal";

let queue: import("bullmq").Queue | null = null;

async function getQueue() {
  if (!getRedisClient()) return null;
  if (!queue) {
    const { Queue } = await import("bullmq");
    queue = new Queue(BULK_QUEUE_NAME, { connection: { url: process.env.REDIS_URL } as never });
  }
  return queue;
}

/** Enqueue a bulk job for processing. */
export async function enqueueBulkJob(jobId: string): Promise<void> {
  const q = await getQueue();
  if (q) {
    await q.add("appraise", { jobId }, { removeOnComplete: true, removeOnFail: 100 });
    return;
  }
  // In-memory fallback: process without blocking the request.
  setImmediate(() => {
    processBulkJob(jobId).catch((err) => console.error("[bulk] job failed:", err));
  });
}
