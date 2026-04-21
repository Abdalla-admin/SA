const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const designs = await prisma.design.findMany({ include: { project: { select: { id: true, name: true, customer: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } });
  res.json(designs);
});

router.get('/:id', auth, async (req, res) => {
  const design = await prisma.design.findUnique({ where: { id: +req.params.id }, include: { project: true } });
  if (!design) return res.status(404).json({ error: 'Not found' });
  res.json(design);
});

router.post('/', auth, async (req, res) => {
  const design = await prisma.design.create({ data: req.body, include: { project: { select: { id: true, name: true } } } });
  res.status(201).json(design);
});

router.put('/:id', auth, async (req, res) => {
  const design = await prisma.design.update({ where: { id: +req.params.id }, data: req.body, include: { project: { select: { id: true, name: true } } } });
  res.json(design);
});

router.post('/:id/eng-approve', auth, async (req, res) => {
  const design = await prisma.design.update({
    where: { id: +req.params.id },
    data: { status: 'ENG_APPROVED', engApprovedAt: new Date(), engApprovedBy: req.user.name },
  });
  res.json(design);
});

router.post('/:id/send-to-client', auth, async (req, res) => {
  const design = await prisma.design.update({
    where: { id: +req.params.id },
    data: { status: 'SENT_TO_CLIENT', sentToClientAt: new Date() },
  });
  res.json(design);
});

router.post('/:id/client-approve', auth, async (req, res) => {
  const design = await prisma.design.update({
    where: { id: +req.params.id },
    data: { status: 'CLIENT_APPROVED', clientApprovedAt: new Date() },
  });
  // Move project to EXECUTION
  await prisma.project.update({ where: { id: design.projectId }, data: { status: 'PROCUREMENT' } });
  res.json(design);
});

module.exports = router;
