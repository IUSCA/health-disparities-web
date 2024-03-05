/*
  Warnings:

  - You are about to drop the `cohort_participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cohort_user` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `author_id` to the `cohort` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cohort_participants" DROP CONSTRAINT "cohort_participants_cohort_id_fkey";

-- DropForeignKey
ALTER TABLE "cohort_user" DROP CONSTRAINT "cohort_user_cohort_id_fkey";

-- DropForeignKey
ALTER TABLE "cohort_user" DROP CONSTRAINT "cohort_user_user_id_fkey";

-- AlterTable
ALTER TABLE "cohort" ADD COLUMN     "author_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_protected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "participants" INTEGER[],
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "cohort_participants";

-- DropTable
DROP TABLE "cohort_user";

-- CreateIndex
CREATE INDEX "covid_test_participant_id_idx" ON "covid_test"("participant_id");

-- CreateIndex
CREATE INDEX "covid_vax_participant_id_idx" ON "covid_vax"("participant_id");

-- CreateIndex
CREATE INDEX "demographic_participant_id_idx" ON "demographic"("participant_id");

-- CreateIndex
CREATE INDEX "dx_participant_id_idx" ON "dx"("participant_id");

-- CreateIndex
CREATE INDEX "hospital_participant_id_idx" ON "hospital"("participant_id");

-- CreateIndex
CREATE INDEX "lab_participant_id_idx" ON "lab"("participant_id");

-- CreateIndex
CREATE INDEX "medication_participant_id_idx" ON "medication"("participant_id");

-- AddForeignKey
ALTER TABLE "cohort" ADD CONSTRAINT "cohort_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
