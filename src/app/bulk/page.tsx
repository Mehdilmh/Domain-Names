import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BulkUploader } from "@/components/bulk/bulk-uploader";

export const metadata: Metadata = { title: "Bulk appraisal" };

export default async function BulkPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Bulk appraisal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Appraise up to 5,000 domains at once. Jobs run in the background — track progress below and
        download the results as a CSV. One credit is charged per appraised domain.
      </p>
      <div className="mt-6">
        <BulkUploader />
      </div>
    </div>
  );
}
