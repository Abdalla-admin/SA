const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.material.findMany({ orderBy: { name: 'asc' } }));
});

router.get('/low-stock', auth, async (req, res) => {
  const materials = await prisma.material.findMany({ where: { quantity: { lte: prisma.material.fields.minStock } } });
  res.json(materials);
});

router.get('/:id', auth, async (req, res) => {
  const m = await prisma.material.findUnique({ where: { id: +req.params.id }, include: { allocations: { include: { project: { select: { id: true, name: true } } } } } });
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

router.post('/', auth, async (req, res) => {
  res.status(201).json(await prisma.material.create({ data: req.body }));
});

router.put('/:id', auth, async (req, res) => {
  const { id, createdAt, allocations, purchaseItems, ...data } = req.body;
  res.json(await prisma.material.update({ where: { id: +req.params.id }, data }));
});

router.post('/:id/adjust', auth, async (req, res) => {
  const { adjustment, notes } = req.body;
  const m = await prisma.material.update({ where: { id: +req.params.id }, data: { quantity: { increment: adjustment } } });
  res.json(m);
});

router.delete('/:id', auth, async (req, res) => {
  const id = +req.params.id;
  const refs = await prisma.purchaseItem.count({ where: { materialId: id } });
  if (refs > 0) return res.status(400).json({ error: 'Cannot delete: this item has purchase history. Archive it instead by setting quantity to 0.' });
  // Clear optional references then delete
  await prisma.$transaction([
    prisma.quotationItem.updateMany({ where: { materialId: id }, data: { materialId: null } }),
    prisma.invoiceItem.updateMany({ where: { materialId: id }, data: { materialId: null } }),
    prisma.materialAllocation.deleteMany({ where: { materialId: id } }),
    prisma.material.delete({ where: { id } }),
  ]);
  res.json({ success: true });
});

// Sell multiple inventory items to a customer in one transaction
router.post('/sell', auth, async (req, res) => {
  const { customerId, items, dueDate, notes } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'No items provided' });

  // Load all materials and validate stock
  const materials = await prisma.material.findMany({
    where: { id: { in: items.map(i => +i.materialId) } },
  });
  const matMap = Object.fromEntries(materials.map(m => [m.id, m]));

  for (const item of items) {
    const mat = matMap[+item.materialId];
    if (!mat) return res.status(400).json({ error: `Material not found` });
    if (mat.quantity < +item.quantity) {
      return res.status(400).json({ error: `Only ${mat.quantity} ${mat.unit} of "${mat.name}" in stock` });
    }
  }

  const subtotal = items.reduce((sum, i) => sum + +i.quantity * +i.unitPrice, 0);

  const ops = [
    // Deduct each material
    ...items.map(i =>
      prisma.material.update({ where: { id: +i.materialId }, data: { quantity: { decrement: +i.quantity } } })
    ),
    // Create single invoice with all line items
    prisma.invoice.create({
      data: {
        customerId: +customerId,
        type: 'SALE',
        subtotal,
        tax: 0,
        total: subtotal,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        items: {
          create: items.map(i => {
            const mat = matMap[+i.materialId];
            return {
              description: `${mat.name}${mat.brand ? ` (${mat.brand})` : ''}`,
              quantity: +i.quantity,
              unitPrice: +i.unitPrice,
              total: +i.quantity * +i.unitPrice,
            };
          }),
        },
      },
      include: { customer: { select: { id: true, name: true } }, items: true, payments: true, contract: true },
    }),
  ];

  const results = await prisma.$transaction(ops);
  const invoice = results[results.length - 1];
  const updatedMaterials = results.slice(0, items.length);

  res.status(201).json({ materials: updatedMaterials, invoice });
});

module.exports = router;
