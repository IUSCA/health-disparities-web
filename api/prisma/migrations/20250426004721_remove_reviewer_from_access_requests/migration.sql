/*
  Warnings:

  - You are about to drop the column `reviewer_id` on the `cohort_access_request` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "cohort_access_request" DROP CONSTRAINT "cohort_access_request_reviewer_id_fkey";

-- AlterTable
ALTER TABLE "cohort_access_request" DROP COLUMN "reviewer_id";
