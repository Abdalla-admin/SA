const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  customer: { select: { id: true, name: true } },
  items: true,
  invoice: { select: { id: true, status: true } },
};

router.get('/', auth, async (req, res) => {
  res.json(await prisma.quotation.findMany({ include, orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const q = await prisma.quotation.findUnique({ where: { id: +req.params.id }, include });
  if (!q) return res.status(404).json({ error: 'Not found' });
  res.json(q);
});

router.post('/', auth, async (req, res) => {
  const { items, ...data } = req.body;
  const quotation = await prisma.quotation.create({ data: { ...data, items: { create: items } }, include });
  res.status(201).json(quotation);
});

router.put('/:id', auth, async (req, res) => {
  const { id, items, customer, invoice, createdAt, ...data } = req.body;
  const qid = +req.params.id;
  if (items) {
    const [, quotation] = await prisma.$transaction([
      prisma.quotationItem.deleteMany({ where: { quotationId: qid } }),
      prisma.quotation.update({
        where: { id: qid },
        data: { ...data, items: { create: items.map(i => ({ description: i.description, quantity: +i.quantity, unitPrice: +i.unitPrice, total: +i.quantity * +i.unitPrice })) } },
        include,
      }),
    ]);
    return res.json(quotation);
  }
  res.json(await prisma.quotation.update({ where: { id: qid }, data, include }));
});

router.delete('/:id', auth, async (req, res) => {
  const q = await prisma.quotation.findUnique({ where: { id: +req.params.id } });
  if (!q) return res.status(404).json({ error: 'Not found' });
  if (q.status === 'CONVERTED') return res.status(400).json({ error: 'Cannot delete a converted quotation' });
  await prisma.quotation.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

router.post('/:id/convert', auth, async (req, res) => {
  const q = await prisma.quotation.findUnique({ where: { id: +req.params.id }, include });
  if (!q) return res.status(404).json({ error: 'Not found' });
  const [updatedQ, invoice] = await prisma.$transaction([
    prisma.quotation.update({ where: { id: q.id }, data: { status: 'CONVERTED' } }),
    prisma.invoice.create({
      data: {
        customerId: q.customerId,
        quotationId: q.id,
        subtotal: q.subtotal,
        tax: q.tax,
        total: q.total,
        dueDate: req.body.dueDate,
        items: { create: q.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })) },
      },
    }),
  ]);
  res.json({ quotation: updatedQ, invoice });
});

module.exports = router;
