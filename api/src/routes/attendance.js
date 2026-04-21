const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { month, year } = req.query;
  const where = {};
  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    where.date = { gte: start, lt: end };
  }
  res.json(await prisma.attendance.findMany({
    where,
    include: { employee: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  }));
});

router.post('/', auth, async (req, res) => {
  res.status(201).json(await prisma.attendance.create({ data: req.body }));
});

router.put('/:id', auth, async (req, res) => {
  res.json(await prisma.attendance.update({ where: { id: +req.params.id }, data: req.body }));
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.attendance.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
