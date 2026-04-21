const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  vendor: { select: { id: true, name: true } },
  items: { include: { material: { select: { id: true, name: true, unit: true } } } },
};

router.get('/', auth, async (req, res) => {
  res.json(await prisma.purchase.findMany({ include, orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const p = await prisma.purchase.findUnique({ where: { id: +req.params.id }, include });
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

router.post('/', auth, async (req, res) => {
  const { items, ...data } = req.body;
  const total = items.reduce((s, i) => s + i.totalCost, 0);
  const purchase = await prisma.purchase.create({
    data: { ...data, totalAmount: total, items: { create: items } },
    include,
  });
  res.status(201).json(purchase);
});

router.put('/:id', auth, async (req, res) => {
  const { items, ...data } = req.body;
  const purchase = await prisma.purchase.update({ where: { id: +req.params.id }, data, include });
  res.json(purchase);
});

// Receive purchase order — increment material stock + record expense
router.post('/:id/receive', auth, async (req, res) => {
  const purchase = await prisma.purchase.findUnique({ where: { id: +req.params.id }, include });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  await prisma.$transaction([
    prisma.purchase.update({ where: { id: purchase.id }, data: { status: 'RECEIVED', receivedAt: new Date() } }),
    ...purchase.items.map(item =>
      prisma.material.update({ where: { id: item.materialId }, data: { quantity: { increment: item.quantity } } })
    ),
    prisma.expense.create({
      data: {
        description: `PO-${String(purchase.id).padStart(4,'0')} – ${purchase.vendor?.name || 'Unknown vendor'}`,
        category: 'purchase',
        amount: purchase.totalAmount,
        expenseDate: new Date(),
      },
    }),
  ]);
  res.json({ success: true });
});

module.exports = router;
