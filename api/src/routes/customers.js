const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
  res.json(customers);
});

router.get('/:id', auth, async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: +req.params.id },
    include: { leads: true, projects: { select: { id: true, name: true, status: true } }, invoices: true },
  });
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json(customer);
});

router.post('/', auth, async (req, res) => {
  const customer = await prisma.customer.create({ data: req.body });
  res.status(201).json(customer);
});

router.put('/:id', auth, async (req, res) => {
  const customer = await prisma.customer.update({ where: { id: +req.params.id }, data: req.body });
  res.json(customer);
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.customer.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
