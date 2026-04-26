const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.expense.findMany({
    include: { project: { select: { id: true, name: true } }, bankAccount: { select: { id: true, name: true } } },
    orderBy: { expenseDate: 'desc' },
  }));
});

router.post('/', auth, async (req, res) => {
  const { bankAccountId, amount, ...rest } = req.body;
  const [expense] = await prisma.$transaction([
    prisma.expense.create({ data: { ...rest, amount, bankAccountId } }),
    ...(bankAccountId ? [prisma.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { decrement: amount } } })] : []),
  ]);
  res.status(201).json(expense);
});

router.put('/:id', auth, async (req, res) => {
  const { id, project, bankAccount, createdAt, ...data } = req.body;
  if (data.expenseDate) data.expenseDate = new Date(data.expenseDate);
  res.json(await prisma.expense.update({ where: { id: +req.params.id }, data }));
});

router.delete('/:id', auth, async (req, res) => {
  const expense = await prisma.expense.findUnique({ where: { id: +req.params.id } });
  if (!expense) return res.status(404).json({ error: 'Not found' });
  await prisma.$transaction([
    prisma.expense.delete({ where: { id: +req.params.id } }),
    ...(expense.bankAccountId ? [prisma.bankAccount.update({ where: { id: expense.bankAccountId }, data: { balance: { increment: expense.amount } } })] : []),
  ]);
  res.json({ success: true });
});

module.exports = router;
