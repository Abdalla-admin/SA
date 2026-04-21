const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.bankAccount.findMany({ orderBy: { name: 'asc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const account = await prisma.bankAccount.findUnique({
    where: { id: +req.params.id },
    include: {
      payments: {
        orderBy: { paidAt: 'desc' },
        include: { invoice: { select: { id: true, customer: { select: { name: true } } } } },
      },
      expenses: { orderBy: { expenseDate: 'desc' } },
      transfersFrom: {
        orderBy: { transferDate: 'desc' },
        include: { toAccount: { select: { id: true, name: true } } },
      },
      transfersTo: {
        orderBy: { transferDate: 'desc' },
        include: { fromAccount: { select: { id: true, name: true } } },
      },
    },
  });
  if (!account) return res.status(404).json({ error: 'Not found' });
  res.json(account);
});

router.post('/', auth, async (req, res) => {
  res.status(201).json(await prisma.bankAccount.create({ data: req.body }));
});

router.put('/:id', auth, async (req, res) => {
  const { id, payments, expenses, transfersFrom, transfersTo, transactions, createdAt, ...data } = req.body;
  res.json(await prisma.bankAccount.update({ where: { id: +req.params.id }, data }));
});

module.exports = router;
