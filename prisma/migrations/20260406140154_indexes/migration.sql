-- CreateIndex
CREATE INDEX "Record_userId_deletedAt_date_idx" ON "Record"("userId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "Record_date_idx" ON "Record"("date");

-- CreateIndex
CREATE INDEX "Record_deletedAt_idx" ON "Record"("deletedAt");
