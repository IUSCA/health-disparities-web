/*
  Warnings:

  - A unique constraint covering the columns `[request_id]` on the table `cohort_access_request` will be added. If there are existing duplicate values, this will fail.

*/

-- DropIndex
DROP INDEX "cohort_access_request_cohort_id_idx";

-- DropIndex
DROP INDEX "cohort_access_request_requester_id_cohort_id_key";

-- DropIndex
DROP INDEX "cohort_access_request_requester_id_idx";

-- DropIndex
DROP INDEX "cohort_access_request_status_idx";

-- AlterTable
ALTER TABLE "cohort_access_request" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "last_synced_at" TIMESTAMP(3),
ADD COLUMN     "request_id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "upstream_record_id" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "status" SET DEFAULT 'INITIATED';

-- CreateTable
CREATE TABLE "access_request_stage_definition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "access_request_stage_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_request_stage" (
    "id" SERIAL NOT NULL,
    "access_request_id" INTEGER NOT NULL,
    "definition_id" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "decision_date" TIMESTAMP(3),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_request_stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_request_audit_log" (
    "id" SERIAL NOT NULL,
    "access_request_id" INTEGER,
    "stage_id" INTEGER,
    "changed_by_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "change_source" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "old_data" JSONB,
    "new_data" JSONB,
    "reason" TEXT,

    CONSTRAINT "access_request_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_request_stage_access_request_id_idx" ON "access_request_stage"("access_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_request_stage_access_request_id_definition_id_key" ON "access_request_stage"("access_request_id", "definition_id");

-- CreateIndex
CREATE INDEX "access_request_audit_log_access_request_id_idx" ON "access_request_audit_log"("access_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "cohort_access_request_request_id_key" ON "cohort_access_request"("request_id");

-- AddForeignKey
ALTER TABLE "access_request_stage" ADD CONSTRAINT "access_request_stage_access_request_id_fkey" FOREIGN KEY ("access_request_id") REFERENCES "cohort_access_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_request_stage" ADD CONSTRAINT "access_request_stage_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "access_request_stage_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_request_audit_log" ADD CONSTRAINT "access_request_audit_log_access_request_id_fkey" FOREIGN KEY ("access_request_id") REFERENCES "cohort_access_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_request_audit_log" ADD CONSTRAINT "access_request_audit_log_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "access_request_stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_request_audit_log" ADD CONSTRAINT "access_request_audit_log_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: partial unique index
-- This ensures that a user can only have one initiated, pending or approved access request for a specific cohort
-- but allows for multiple requests in other statuses.
CREATE UNIQUE INDEX active_request_unique ON "cohort_access_request"("requester_id", "cohort_id") WHERE "status" IN ('INITIATED', 'PENDING', 'APPROVED');