import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/bulk/:id          -> job status JSON (for progress polling)
 * GET /api/bulk/:id?format=csv -> downloadable result CSV when done
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const job = await prisma.bulkJob.findUnique({ where: { id } });
  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const wantsCsv = req.nextUrl.searchParams.get("format") === "csv";
  if (wantsCsv) {
    if (job.status !== "done" || !job.resultCsv) {
      return NextResponse.json({ error: "job not finished" }, { status: 409 });
    }
    return new NextResponse(job.resultCsv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="appraisals-${job.id}.csv"`,
      },
    });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    total: job.total,
    processed: job.processed,
    progress: job.total ? Math.round((job.processed / job.total) * 100) : 0,
    error: job.error,
  });
}
