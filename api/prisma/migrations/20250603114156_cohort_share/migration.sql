-- CreateTable
CREATE TABLE "cohort_share" (
    "id" SERIAL NOT NULL,
    "cohort_id" UUID NOT NULL,
    "user_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_favorite" (
    "cohort_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_favorite_pkey" PRIMARY KEY ("cohort_id","user_id")
);

-- AddForeignKey
ALTER TABLE "cohort_share" ADD CONSTRAINT "cohort_share_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_share" ADD CONSTRAINT "cohort_share_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_share" ADD CONSTRAINT "cohort_share_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_favorite" ADD CONSTRAINT "cohort_favorite_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_favorite" ADD CONSTRAINT "cohort_favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
