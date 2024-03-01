-- AlterTable
ALTER TABLE "cohort" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

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
