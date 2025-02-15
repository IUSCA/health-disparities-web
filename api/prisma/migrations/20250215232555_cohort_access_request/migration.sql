-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "cohort_access_request" (
    "id" SERIAL NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "cohort_id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer_id" INTEGER,
    "decision_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_access_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cohort_access_request_cohort_id_idx" ON "cohort_access_request"("cohort_id");

-- CreateIndex
CREATE INDEX "cohort_access_request_requester_id_idx" ON "cohort_access_request"("requester_id");

-- CreateIndex
CREATE INDEX "cohort_access_request_status_idx" ON "cohort_access_request"("status");

-- AddForeignKey
ALTER TABLE "cohort_access_request" ADD CONSTRAINT "cohort_access_request_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_access_request" ADD CONSTRAINT "cohort_access_request_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_access_request" ADD CONSTRAINT "cohort_access_request_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
