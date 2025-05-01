-- DropForeignKey
ALTER TABLE "cohort_access_request" DROP CONSTRAINT "cohort_access_request_cohort_id_fkey";

-- DropForeignKey
ALTER TABLE "cohort_access_request" DROP CONSTRAINT "cohort_access_request_requester_id_fkey";

-- AddForeignKey
ALTER TABLE "cohort_access_request" ADD CONSTRAINT "cohort_access_request_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_access_request" ADD CONSTRAINT "cohort_access_request_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
