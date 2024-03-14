-- DropIndex
DROP INDEX "dx_participant_id_idx";

-- CreateTable
CREATE TABLE "query_analytics" (
    "id" SERIAL NOT NULL,
    "query" JSONB NOT NULL,
    "sql" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "run_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author_id" INTEGER NOT NULL,
    "execution_time" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "query_analytics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "query_analytics" ADD CONSTRAINT "query_analytics_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
