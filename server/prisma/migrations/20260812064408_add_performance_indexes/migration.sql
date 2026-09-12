-- CreateIndex
CREATE INDEX "Gate_fk_user_id_status_idx" ON "Gate"("fk_user_id", "status");

-- CreateIndex
CREATE INDEX "Gate_fk_user_id_createdAt_idx" ON "Gate"("fk_user_id", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_fk_user_id_read_idx" ON "Notification"("fk_user_id", "read");

-- CreateIndex
CREATE INDEX "Notification_fk_user_id_createdAt_idx" ON "Notification"("fk_user_id", "createdAt");

-- CreateIndex
CREATE INDEX "Quest_fk_user_id_status_idx" ON "Quest"("fk_user_id", "status");

-- CreateIndex
CREATE INDEX "Quest_fk_user_id_fk_gate_id_idx" ON "Quest"("fk_user_id", "fk_gate_id");

-- CreateIndex
CREATE INDEX "Quest_fk_user_id_completedAt_idx" ON "Quest"("fk_user_id", "completedAt");
