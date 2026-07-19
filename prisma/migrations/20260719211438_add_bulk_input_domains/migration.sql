/*
  Warnings:

  - Added the required column `inputDomains` to the `BulkJob` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BulkJob" ADD COLUMN     "inputDomains" JSONB NOT NULL;
