-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN "expenseId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_expenseId_key" ON "Payslip"("expenseId");

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
