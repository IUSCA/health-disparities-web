-- CreateIndex
CREATE INDEX "ncbiRefSeqCurated_chr_txStart_txEnd_idx" ON "ncbiRefSeqCurated"("chr", "txStart", "txEnd");

-- CreateIndex
CREATE INDEX "ncbiRefSeqCurated_name2_idx" ON "ncbiRefSeqCurated"("name2");
