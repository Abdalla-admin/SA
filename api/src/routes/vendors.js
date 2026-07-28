const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.vendor.findMany({ orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const v = await prisma.vendor.findUnique({ where: { id: +req.params.id }, include: { purchases: true } });
  if (!v) return res.status(404).json({ error: 'Not found' });
  res.json(v);
});

router.post('/', auth, async (req, res) => {
  res.status(201).json(await prisma.vendor.create({ data: req.body }));
});

router.put('/:id', auth, async (req, res) => {
  res.json(await prisma.vendor.update({ where: { id: +req.params.id }, data: req.body }));
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.vendor.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
