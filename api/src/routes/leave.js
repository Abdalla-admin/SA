const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.leave.findMany({
    include: { employee: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  }));
});

router.post('/', auth, async (req, res) => {
  res.status(201).json(await prisma.leave.create({ data: req.body }));
});

router.post('/:id/approve', auth, async (req, res) => {
  res.json(await prisma.leave.update({ where: { id: +req.params.id }, data: { status: 'APPROVED', approvedBy: req.user.name, approvedAt: new Date() } }));
});

router.post('/:id/reject', auth, async (req, res) => {
  res.json(await prisma.leave.update({ where: { id: +req.params.id }, data: { status: 'REJECTED', approvedBy: req.user.name, approvedAt: new Date() } }));
});

module.exports = router;
