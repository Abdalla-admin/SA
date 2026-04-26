const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  customer: { select: { id: true, name: true } },
  contract: { select: { id: true, title: true } },
  items: true,
  payments: true,
};

router.get('/', auth, async (req, res) => {
  // fire-and-forget — don't block the read with a write lock
  prisma.invoice.updateMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  }).catch(() => {});
  const where = req.query.status ? { status: req.query.status } : {};
  res.json(await prisma.invoice.findMany({ where, include, orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const inv = await prisma.invoice.findUnique({ where: { id: +req.params.id }, include });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  res.json(inv);
});

router.post('/', auth, async (req, res) => {
  const { items, ...data } = req.body;
  const invoice = await prisma.invoice.create({ data: { ...data, items: { create: items || [] } }, include });
  res.status(201).json(invoice);
});

router.put('/:id', auth, async (req, res) => {
  const { id, items, customer, contract, payments, createdAt, ...data } = req.body;
  const invoiceId = +req.params.id;
  const [, invoice] = await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { ...data, ...(items ? { items: { create: items.map(i => ({ description: i.description, quantity: +i.quantity, unitPrice: +i.unitPrice, total: +i.quantity * +i.unitPrice })) } } : {}) },
      include,
    }),
  ]);
  res.json(invoice);
});

router.patch('/:id/void', auth, async (req, res) => {
  const invoice = await prisma.invoice.update({ where: { id: +req.params.id }, data: { status: 'CANCELLED' }, include });
  res.json(invoice);
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.invoice.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
