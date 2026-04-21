const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.employee.findMany({ orderBy: { name: 'asc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const e = await prisma.employee.findUnique({ where: { id: +req.params.id }, include: { payslips: { orderBy: { createdAt: 'desc' }, take: 12 } } });
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json(e);
});

router.post('/', auth, async (req, res) => {
  res.status(201).json(await prisma.employee.create({ data: req.body }));
});

router.put('/:id', auth, async (req, res) => {
  res.json(await prisma.employee.update({ where: { id: +req.params.id }, data: req.body }));
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.employee.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
