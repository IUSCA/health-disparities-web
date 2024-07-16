-- AlterTable
ALTER TABLE "covid_vax" ALTER COLUMN "series_doses" DROP NOT NULL,
ALTER COLUMN "is_booster" DROP NOT NULL;

-- AlterTable
ALTER TABLE "lab" ALTER COLUMN "result" DROP NOT NULL,
ALTER COLUMN "unit" DROP NOT NULL;
