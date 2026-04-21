const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../middleware/prisma');
const { auth, role } = require('../middleware/auth');

router.get('/', auth, role('ADMIN', 'CEO'), async (req, res) => {
  res.json(await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }, orderBy: { name: 'asc' } }));
});

router.post('/', auth, role('ADMIN'), async (req, res) => {
  const { password, ...rest } = req.body;
  const user = await prisma.user.create({ data: { ...rest, password: bcrypt.hashSync(password, 10) }, select: { id: true, name: true, email: true, role: true } });
  res.status(201).json(user);
});

router.put('/:id', auth, role('ADMIN'), async (req, res) => {
  const { password, ...rest } = req.body;
  const data = password ? { ...rest, password: bcrypt.hashSync(password, 10) } : rest;
  const user = await prisma.user.update({ where: { id: +req.params.id }, data, select: { id: true, name: true, email: true, role: true, active: true } });
  res.json(user);
});

router.delete('/:id', auth, role('ADMIN'), async (req, res) => {
  await prisma.user.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
