const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  customer: { select: { id: true, name: true } },
  contract: { select: { id: true, title: true } },
  project: { select: { id: true, name: true } },
  items: { include: { material: { select: { id: true, name: true, unit: true } } } },
  payments: true,
};

const mapItem = i => ({
  description: i.description,
  quantity:    +i.quantity,
  unitPrice:   +i.unitPrice,
  total:       +i.quantity * +i.unitPrice,
  ...(i.materialId ? { materialId: +i.materialId } : {}),
});

router.get('/', auth, async (req, res) => {
  prisma.invoice.updateMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  }).catch(() => {});
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;
  if (req.query.projectId) where.projectId = +req.query.projectId;
  res.json(await prisma.invoice.findMany({ where, include, orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const inv = await prisma.invoice.findUnique({ where: { id: +req.params.id }, include });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  res.json(inv);
});

router.post('/', auth, async (req, res) => {
  const { items, ...data } = req.body;
  const matItems = (items || []).filter(i => i.materialId);
  const [invoice] = await prisma.$transaction([
    prisma.invoice.create({ data: { ...data, items: { create: (items || []).map(mapItem) } }, include }),
    ...matItems.map(i => prisma.material.update({ where: { id: +i.materialId }, data: { quantity: { decrement: +i.quantity } } })),
  ]);
  res.status(201).json(invoice);
});

router.put('/:id', auth, async (req, res) => {
  const { id, items, customer, contract, project, payments, createdAt, ...data } = req.body;
  const invoiceId = +req.params.id;
  const [, invoice] = await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { ...data, ...(items ? { items: { create: items.map(mapItem) } } : {}) },
      include,
    }),
  ]);
  res.json(invoice);
});

router.patch('/:id/project', auth, async (req, res) => {
  const { projectId } = req.body;
  const invoice = await prisma.invoice.update({
    where: { id: +req.params.id },
    data: { projectId: projectId ? +projectId : null },
    include,
  });
  res.json(invoice);
});

router.patch('/:id/void', auth, async (req, res) => {
  const inv = await prisma.invoice.findUnique({ where: { id: +req.params.id }, include: { items: true } });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  const matItems = inv.items.filter(i => i.materialId);
  const [invoice] = await prisma.$transaction([
    prisma.invoice.update({ where: { id: +req.params.id }, data: { status: 'CANCELLED' }, include }),
    ...matItems.map(i => prisma.material.update({ where: { id: i.materialId }, data: { quantity: { increment: i.quantity } } })),
  ]);
  res.json(invoice);
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.invoice.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
