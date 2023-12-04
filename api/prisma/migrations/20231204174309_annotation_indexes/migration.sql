-- CreateIndex
CREATE INDEX "annotation_func_idx" ON "annotation"("func");

-- CreateIndex
CREATE INDEX "annotation_genes_idx" ON "annotation"("genes");

-- CreateIndex
CREATE INDEX "annotation_exonic_func_idx" ON "annotation"("exonic_func");

-- CreateIndex
CREATE INDEX "annotation_cln_sig_idx" ON "annotation"("cln_sig");
