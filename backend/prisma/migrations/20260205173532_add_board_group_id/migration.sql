-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "groupId" UUID;

-- CreateIndex
CREATE INDEX "Board_groupId_idx" ON "Board"("groupId");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
