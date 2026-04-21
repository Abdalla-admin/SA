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
  await prisma.material.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
