-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "bankAccountId" INTEGER;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
