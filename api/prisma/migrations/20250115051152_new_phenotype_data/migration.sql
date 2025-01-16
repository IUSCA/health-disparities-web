/*
  Warnings:

  - You are about to drop the column `category` on the `lab` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `lab` table. All the data in the column will be lost.
  - You are about to drop the `results_by` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `loinc_code` to the `lab` table without a default value. This is not possible if the table is not empty.
  - Added the required column `loinc_name` to the `lab` table without a default value. This is not possible if the table is not empty.
  - Added the required column `result_type` to the `lab` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "lab_participant_id_idx";

-- DropIndex
DROP INDEX "medication_participant_id_idx";

-- AlterTable
ALTER TABLE "lab" DROP COLUMN "category",
DROP COLUMN "result",
ADD COLUMN     "loinc_code" TEXT NOT NULL,
ADD COLUMN     "loinc_name" TEXT NOT NULL,
ADD COLUMN     "result_coded" TEXT,
ADD COLUMN     "result_num" DECIMAL(65,30),
ADD COLUMN     "result_type" TEXT NOT NULL;

-- DropTable
DROP TABLE "results_by";

-- CreateTable
CREATE TABLE "measurement" (
    "id" SERIAL NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "event_name" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_screen" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "result_raw" TEXT NOT NULL,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "drug_screen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_alt" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "dose_number" INTEGER,
    "series_doses" INTEGER,
    "description_1" TEXT,
    "description_2" TEXT,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "measurement_participant_id_event_name_idx" ON "measurement"("participant_id", "event_name");

-- CreateIndex
CREATE INDEX "drug_screen_participant_id_idx" ON "drug_screen"("participant_id");

-- CreateIndex
CREATE INDEX "vaccination_participant_id_idx" ON "vaccination"("participant_id");

-- AddForeignKey
ALTER TABLE "measurement" ADD CONSTRAINT "measurement_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_screen" ADD CONSTRAINT "drug_screen_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination" ADD CONSTRAINT "vaccination_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
