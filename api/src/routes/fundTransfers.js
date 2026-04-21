const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.fundTransfer.findMany({
    include: { fromAccount: { select: { id: true, name: true } }, toAccount: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  }));
});

router.post('/', auth, async (req, res) => {
  const { fromAccountId, toAccountId, amount, reference, notes } = req.body;
  const from = await prisma.bankAccount.findUnique({ where: { id: fromAccountId } });
  if (!from || from.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  const [transfer] = await prisma.$transaction([
    prisma.fundTransfer.create({ data: { fromAccountId, toAccountId, amount, reference, notes } }),
    prisma.bankAccount.update({ where: { id: fromAccountId }, data: { balance: { decrement: amount } } }),
    prisma.bankAccount.update({ where: { id: toAccountId }, data: { balance: { increment: amount } } }),
  ]);
  res.status(201).json(transfer);
});

module.exports = router;
