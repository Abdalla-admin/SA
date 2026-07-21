-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN "bankAccountId" INTEGER;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
