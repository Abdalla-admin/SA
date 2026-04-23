const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  vendor:      { select: { id: true, name: true } },
  bankAccount: { select: { id: true, name: true } },
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
  try {
    const { items, ...data } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'At least one line item is required' });
    const total = items.reduce((s, i) => s + (+i.totalCost || 0), 0);
    const purchase = await prisma.purchase.create({
      data: { ...data, totalAmount: total, items: { create: items } },
      include,
    });
    res.status(201).json(purchase);
  } catch (err) {
    console.error('PO create error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create purchase order' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { id, items, vendor, bankAccount, createdAt, updatedAt, ...data } = req.body;
  const purchase = await prisma.purchase.update({ where: { id: +req.params.id }, data, include });
  res.json(purchase);
});

// Receive PO — increment stock + record expense + deduct bank account
router.post('/:id/receive', auth, async (req, res) => {
  const purchase = await prisma.purchase.findUnique({ where: { id: +req.params.id }, include });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  if (purchase.status === 'RECEIVED') return res.status(400).json({ error: 'Already received' });

  const ops = [
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
        bankAccountId: purchase.bankAccountId || null,
      },
    }),
  ];

  // Deduct from bank account if one is selected
  if (purchase.bankAccountId) {
    ops.push(
      prisma.bankAccount.update({
        where: { id: purchase.bankAccountId },
        data: { balance: { decrement: purchase.totalAmount } },
      })
    );
  }

  await prisma.$transaction(ops);
  res.json({ success: true });
});

module.exports = router;
