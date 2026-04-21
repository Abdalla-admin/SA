const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  // Auto-expire warranties
  await prisma.warranty.updateMany({ where: { endDate: { lt: new Date() }, status: 'ACTIVE' }, data: { status: 'EXPIRED' } });
  res.json(await prisma.warranty.findMany({
    include: { project: { select: { id: true, name: true, customer: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  }));
});

router.get('/:id', auth, async (req, res) => {
  const w = await prisma.warranty.findUnique({
    where: { id: +req.params.id },
    include: { project: { include: { customer: true } }, maintenanceRequests: true },
  });
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});

router.post('/', auth, async (req, res) => {
  res.status(201).json(await prisma.warranty.create({ data: req.body }));
});

router.put('/:id', auth, async (req, res) => {
  res.json(await prisma.warranty.update({ where: { id: +req.params.id }, data: req.body }));
});

module.exports = router;
