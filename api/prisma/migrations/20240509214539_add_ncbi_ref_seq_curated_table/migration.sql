-- CreateEnum
CREATE TYPE "cds_type" AS ENUM ('none', 'unk', 'incmpl', 'cmpl');

-- AlterTable
ALTER TABLE "source" ADD COLUMN     "build" TEXT;

-- CreateTable
CREATE TABLE "ncbiRefSeqCurated" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name2" TEXT NOT NULL,
    "chr" SMALLINT NOT NULL,
    "strand" TEXT NOT NULL,
    "txStart" BIGINT NOT NULL,
    "txEnd" BIGINT NOT NULL,
    "cdsStart" BIGINT NOT NULL,
    "cdsEnd" BIGINT NOT NULL,
    "exonCount" INTEGER NOT NULL,
    "exonStarts" INTEGER[],
    "exonEnds" INTEGER[],
    "score" INTEGER,
    "cdsStartStat" "cds_type" NOT NULL,
    "cdsEndStat" "cds_type" NOT NULL,
    "exonFrames" INTEGER[],
    "build" TEXT NOT NULL,

    CONSTRAINT "ncbiRefSeqCurated_pkey" PRIMARY KEY ("id")
);
