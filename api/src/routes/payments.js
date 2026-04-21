const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.payment.findMany({
    include: { invoice: { select: { id: true, total: true, customer: { select: { name: true } } } }, bankAccount: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  }));
});

router.post('/', auth, async (req, res) => {
  const { invoiceId, amount, bankAccountId, method, reference, paidAt, notes } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0) + amount;
  const status = paid >= invoice.total ? 'PAID' : 'PARTIAL';

  const [payment] = await prisma.$transaction([
    prisma.payment.create({ data: { invoiceId, amount, bankAccountId, method, reference, paidAt: paidAt ? new Date(paidAt) : new Date(), notes } }),
    prisma.invoice.update({ where: { id: invoiceId }, data: { status } }),
    ...(bankAccountId ? [prisma.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { increment: amount } } })] : []),
  ]);
  res.status(201).json(payment);
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.payment.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
