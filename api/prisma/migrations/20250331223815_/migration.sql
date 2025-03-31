/*
  Warnings:

  - A unique constraint covering the columns `[requester_id,cohort_id]` on the table `cohort_access_request` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "cohort_access_request_requester_id_cohort_id_key" ON "cohort_access_request"("requester_id", "cohort_id");
