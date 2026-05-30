const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  payments: { orderBy: { paidAt: 'desc' }, take: 12 },
};

router.get('/', auth, async (req, res) => {
  res.json(await prisma.subscription.findMany({ include, orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: +req.params.id }, include });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  res.json(sub);
});

router.post('/', auth, async (req, res) => {
  const { customerId, name, amount, billingDay, startDate, notes } = req.body;
  const sub = await prisma.subscription.create({
    data: { customerId: +customerId, name, amount: +amount, billingDay: +billingDay, startDate: new Date(startDate), notes },
    include,
  });
  res.status(201).json(sub);
});

router.put('/:id', auth, async (req, res) => {
  const { id, customer, payments, createdAt, updatedAt, ...data } = req.body;
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.amount) data.amount = +data.amount;
  if (data.billingDay) data.billingDay = +data.billingDay;
  const sub = await prisma.subscription.update({ where: { id: +req.params.id }, data, include });
  res.json(sub);
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.subscription.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

// Record a payment
router.post('/:id/pay', auth, async (req, res) => {
  const { amount, paidAt, notes } = req.body;
  const paidDate = paidAt ? new Date(paidAt) : new Date();
  const [payment, sub] = await prisma.$transaction([
    prisma.subscriptionPayment.create({
      data: { subscriptionId: +req.params.id, amount: +amount, paidAt: paidDate, notes },
    }),
    prisma.subscription.update({
      where: { id: +req.params.id },
      data: { lastPaidAt: paidDate },
      include,
    }),
  ]);
  res.status(201).json(sub);
});

module.exports = router;
