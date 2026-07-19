"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, Download, CheckCircle2 } from "lucide-react";
import { startBulkAppraisal } from "@/server/actions/bulk";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface JobStatus {
  status: string;
  processed: number;
  total: number;
  progress: number;
}

export function BulkUploader() {
  const [csv, setCsv] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await startBulkAppraisal(csv);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setJobId(res.jobId);
    setStatus({ status: "queued", processed: 0, total: res.total, progress: 0 });
    poll(res.jobId);
  }

  function poll(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/bulk/${id}`);
      if (!r.ok) return;
      const data = (await r.json()) as JobStatus;
      setStatus(data);
      if (data.status === "done" || data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1200);
  }

  const rowCount = csv
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s && s !== "domain").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/40 p-8 text-center"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium">Upload a CSV of domains</p>
            <p className="text-xs text-muted-foreground">One domain per row, up to 5,000 rows</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onFile} />
          </div>

          <div className="mt-4">
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={"…or paste domains here:\ncloudmind.io\nswiftpay.com\ndatavault.ai"}
              className="mono-num h-32 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:font-sans placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{rowCount} domain(s) detected</span>
            <Button onClick={submit} disabled={submitting || rowCount === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start bulk appraisal"}
            </Button>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {jobId && status && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {status.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                <span className="capitalize">{status.status}</span>
                <span className="mono-num text-muted-foreground">
                  {status.processed}/{status.total}
                </span>
              </div>
              {status.status === "done" && (
                <a href={`/api/bulk/${jobId}?format=csv`}>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" /> Download CSV
                  </Button>
                </a>
              )}
            </div>
            <div className="mt-3 h-2 rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
