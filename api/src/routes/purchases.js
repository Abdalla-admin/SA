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
  const purchaseId = +req.params.id;
  const existing = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status === 'RECEIVED') return res.status(400).json({ error: 'Cannot edit a received purchase order. Unreceive it first.' });

  const { id, items, vendor, bankAccount, createdAt, updatedAt, ...data } = req.body;

  if (items) {
    if (!items.length) return res.status(400).json({ error: 'At least one line item is required' });
    const total = items.reduce((s, i) => s + (+i.totalCost || 0), 0);
    const [, purchase] = await prisma.$transaction([
      prisma.purchaseItem.deleteMany({ where: { purchaseId } }),
      prisma.purchase.update({ where: { id: purchaseId }, data: { ...data, totalAmount: total, items: { create: items } }, include }),
    ]);
    return res.json(purchase);
  }

  const purchase = await prisma.purchase.update({ where: { id: purchaseId }, data, include });
  res.json(purchase);
});

// Receive PO — increment stock + record expense + deduct bank account
router.post('/:id/receive', auth, async (req, res) => {
  const purchase = await prisma.purchase.findUnique({ where: { id: +req.params.id }, include });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  if (purchase.status === 'RECEIVED') return res.status(400).json({ error: 'Already received' });
  const receivedAt = req.body.receivedAt ? new Date(req.body.receivedAt) : new Date();

  const ops = [
    prisma.purchase.update({ where: { id: purchase.id }, data: { status: 'RECEIVED', receivedAt } }),
    ...purchase.items.map(item =>
      prisma.material.update({ where: { id: item.materialId }, data: { quantity: { increment: item.quantity }, unitCost: item.unitCost } })
    ),
    prisma.expense.create({
      data: {
        description: `PO-${String(purchase.id).padStart(4,'0')} – ${purchase.vendor?.name || 'Unknown vendor'}`,
        category: 'purchase',
        amount: purchase.totalAmount,
        expenseDate: receivedAt,
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

// Unreceive PO — reverse stock, restore bank balance, remove logged expense
router.patch('/:id/unreceive', auth, async (req, res) => {
  const purchase = await prisma.purchase.findUnique({ where: { id: +req.params.id }, include: { items: true } });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  if (purchase.status !== 'RECEIVED') return res.status(400).json({ error: 'This purchase order has not been received' });

  const materials = await prisma.material.findMany({ where: { id: { in: purchase.items.map(i => i.materialId) } } });
  const matMap = Object.fromEntries(materials.map(m => [m.id, m]));
  for (const item of purchase.items) {
    const mat = matMap[item.materialId];
    if (!mat || mat.quantity < item.quantity) {
      return res.status(400).json({ error: `Cannot unreceive: stock for "${mat?.name || 'item'}" has already been used (only ${mat?.quantity ?? 0} left, need ${item.quantity}).` });
    }
  }

  const code = `PO-${String(purchase.id).padStart(4, '0')}`;
  const expense = await prisma.expense.findFirst({ where: { category: 'purchase', description: { startsWith: code } } });

  const ops = [
    prisma.purchase.update({ where: { id: purchase.id }, data: { status: 'PENDING', receivedAt: null } }),
    ...purchase.items.map(item =>
      prisma.material.update({ where: { id: item.materialId }, data: { quantity: { decrement: item.quantity } } })
    ),
  ];
  if (expense) ops.push(prisma.expense.delete({ where: { id: expense.id } }));
  if (purchase.bankAccountId) {
    ops.push(prisma.bankAccount.update({ where: { id: purchase.bankAccountId }, data: { balance: { increment: purchase.totalAmount } } }));
  }

  await prisma.$transaction(ops);
  res.json({ success: true });
});

router.delete('/:id', auth, async (req, res) => {
  const po = await prisma.purchase.findUnique({ where: { id: +req.params.id }, include: { items: true } });
  if (!po) return res.status(404).json({ error: 'Not found' });
  if (po.status === 'RECEIVED') return res.status(400).json({ error: 'Cannot delete a received purchase order. Stock has already been updated.' });
  await prisma.$transaction([
    prisma.purchaseItem.deleteMany({ where: { purchaseId: po.id } }),
    prisma.purchase.delete({ where: { id: po.id } }),
  ]);
  res.json({ success: true });
});

module.exports = router;
