const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.payslip.findMany({
    include: {
      employee:    { select: { id: true, name: true, position: true } },
      bankAccount: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  }));
});

router.post('/run', auth, async (req, res) => {
  const { month, year, allowances = 0, deductions = 0 } = req.body;
  const [employees, existing] = await Promise.all([
    prisma.employee.findMany({ where: { active: true } }),
    prisma.payslip.findMany({ where: { month: +month, year: +year }, select: { employeeId: true } }),
  ]);
  const existingIds = new Set(existing.map(p => p.employeeId));
  const toCreate = employees.filter(emp => !existingIds.has(emp.id));
  if (toCreate.length === 0) return res.status(400).json({ error: `Payroll for ${month}/${year} already run for all employees.` });
  const payslips = await prisma.$transaction(
    toCreate.map(emp =>
      prisma.payslip.create({
        data: {
          employeeId: emp.id,
          month: +month,
          year:  +year,
          basicSalary: emp.salary,
          allowances,
          deductions,
          netPay: emp.salary + allowances - deductions,
        },
      })
    )
  );
  res.status(201).json(payslips);
});

// Mark a payslip as paid — deducts netPay from the chosen bank account and logs an expense
router.patch('/:id/pay', auth, async (req, res) => {
  const { bankAccountId } = req.body;
  const id = +req.params.id;
  const payslip = await prisma.payslip.findUnique({ where: { id }, include: { employee: { select: { name: true } } } });
  if (!payslip) return res.status(404).json({ error: 'Not found' });
  if (payslip.paidAt) return res.status(400).json({ error: 'This payslip is already marked paid' });
  if (!bankAccountId) return res.status(400).json({ error: 'A bank account is required' });

  const updated = await prisma.$transaction(async tx => {
    await tx.bankAccount.update({ where: { id: +bankAccountId }, data: { balance: { decrement: payslip.netPay } } });
    const expense = await tx.expense.create({
      data: {
        description: `Payroll – ${payslip.employee?.name || 'Employee'} (${payslip.month}/${payslip.year})`,
        category: 'payroll',
        amount: payslip.netPay,
        expenseDate: new Date(),
        bankAccountId: +bankAccountId,
      },
    });
    return tx.payslip.update({
      where: { id },
      data: { paidAt: new Date(), bankAccountId: +bankAccountId, expenseId: expense.id },
      include: {
        employee:    { select: { id: true, name: true, position: true } },
        bankAccount: { select: { id: true, name: true } },
      },
    });
  });
  res.json(updated);
});

// Undo a payment — reverses bank balance, removes the linked expense, clears paid status
router.patch('/:id/unpay', auth, async (req, res) => {
  const id = +req.params.id;
  const payslip = await prisma.payslip.findUnique({ where: { id } });
  if (!payslip) return res.status(404).json({ error: 'Not found' });
  if (!payslip.paidAt) return res.status(400).json({ error: 'This payslip is not marked paid' });

  const updated = await prisma.$transaction(async tx => {
    if (payslip.expenseId) {
      const expense = await tx.expense.findUnique({ where: { id: payslip.expenseId } });
      if (expense) {
        await tx.expenseItem.deleteMany({ where: { expenseId: expense.id } });
        await tx.expense.delete({ where: { id: expense.id } });
        if (expense.bankAccountId) {
          await tx.bankAccount.update({ where: { id: expense.bankAccountId }, data: { balance: { increment: expense.amount } } });
        }
      }
    }
    return tx.payslip.update({
      where: { id },
      data: { paidAt: null, bankAccountId: null, expenseId: null },
      include: {
        employee:    { select: { id: true, name: true, position: true } },
        bankAccount: { select: { id: true, name: true } },
      },
    });
  });
  res.json(updated);
});

// Rollback a payroll run — deletes all payslips for a period, unless some are already paid
router.delete('/:year/:month', auth, async (req, res) => {
  const year = +req.params.year;
  const month = +req.params.month;
  const payslips = await prisma.payslip.findMany({ where: { month, year } });
  if (payslips.length === 0) return res.status(404).json({ error: `No payroll run found for ${month}/${year}` });
  const paidCount = payslips.filter(p => p.paidAt).length;
  if (paidCount > 0) return res.status(400).json({ error: `Cannot rollback: ${paidCount} payslip(s) for ${month}/${year} are already marked paid.` });
  await prisma.payslip.deleteMany({ where: { month, year } });
  res.json({ success: true });
});

module.exports = router;
