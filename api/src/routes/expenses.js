const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  project:     { select: { id: true, name: true } },
  bankAccount: { select: { id: true, name: true } },
  items:       { orderBy: { id: 'asc' } },
};

router.get('/', auth, async (req, res) => {
  res.json(await prisma.expense.findMany({ include, orderBy: { expenseDate: 'desc' } }));
});

router.post('/', auth, async (req, res) => {
  const { bankAccountId, items, ...rest } = req.body;
  const amount = Array.isArray(items) && items.length
    ? items.reduce((s, i) => s + (+i.quantity * +i.unitPrice), 0)
    : +rest.amount || 0;

  const [expense] = await prisma.$transaction([
    prisma.expense.create({
      data: {
        ...rest,
        amount,
        bankAccountId: bankAccountId || null,
        items: Array.isArray(items) && items.length
          ? { create: items.map(i => ({ description: i.description, quantity: +i.quantity, unitPrice: +i.unitPrice, total: +i.quantity * +i.unitPrice })) }
          : undefined,
      },
      include,
    }),
    ...(bankAccountId ? [prisma.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { decrement: amount } } })] : []),
  ]);
  res.status(201).json(expense);
});

router.put('/:id', auth, async (req, res) => {
  const { id, project, bankAccount, createdAt, items, ...data } = req.body;
  if (data.expenseDate) data.expenseDate = new Date(data.expenseDate);

  if (Array.isArray(items)) {
    data.amount = items.reduce((s, i) => s + (+i.quantity * +i.unitPrice), 0);
    await prisma.expenseItem.deleteMany({ where: { expenseId: +req.params.id } });
    data.items = { create: items.map(i => ({ description: i.description, quantity: +i.quantity, unitPrice: +i.unitPrice, total: +i.quantity * +i.unitPrice })) };
  }

  res.json(await prisma.expense.update({ where: { id: +req.params.id }, data, include }));
});

router.delete('/:id', auth, async (req, res) => {
  const expense = await prisma.expense.findUnique({ where: { id: +req.params.id } });
  if (!expense) return res.status(404).json({ error: 'Not found' });
  await prisma.$transaction([
    prisma.expenseItem.deleteMany({ where: { expenseId: +req.params.id } }),
    prisma.expense.delete({ where: { id: +req.params.id } }),
    ...(expense.bankAccountId ? [prisma.bankAccount.update({ where: { id: expense.bankAccountId }, data: { balance: { increment: expense.amount } } })] : []),
  ]);
  res.json({ success: true });
});

module.exports = router;
