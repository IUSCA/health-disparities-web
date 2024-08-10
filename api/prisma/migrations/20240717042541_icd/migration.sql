-- CreateTable
CREATE TABLE "icd_code" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "system" TEXT NOT NULL,

    CONSTRAINT "icd_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icd_hierarchy" (
    "descendant_id" INTEGER NOT NULL,
    "ancestor_id" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "icd_hierarchy_pkey" PRIMARY KEY ("descendant_id","ancestor_id","level")
);

-- AddForeignKey
ALTER TABLE "icd_hierarchy" ADD CONSTRAINT "icd_hierarchy_descendant_id_fkey" FOREIGN KEY ("descendant_id") REFERENCES "icd_code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icd_hierarchy" ADD CONSTRAINT "icd_hierarchy_ancestor_id_fkey" FOREIGN KEY ("ancestor_id") REFERENCES "icd_code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
