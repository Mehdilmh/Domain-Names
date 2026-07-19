/**
 * Standalone BullMQ worker for bulk appraisal jobs.
 *   npm run worker
 *
 * Only needed when REDIS_URL is set. Without Redis, jobs are processed
 * in-process by the web server (see queue.ts fallback), so this is optional.
 */
import { Worker } from "bullmq";
import { BULK_QUEUE_NAME } from "./queue";
import { processBulkJob } from "./bulk-processor";

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is not set — the worker is unnecessary; jobs run in-process.");
  process.exit(0);
}

const worker = new Worker(
  BULK_QUEUE_NAME,
  async (job) => {
    await processBulkJob(job.data.jobId as string);
  },
  { connection: { url: process.env.REDIS_URL } as never, concurrency: 2 },
);

worker.on("completed", (job) => console.log(`✅ bulk job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`❌ bulk job ${job?.id} failed:`, err));

console.log(`👷 Bulk worker listening on queue "${BULK_QUEUE_NAME}"`);
