const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  customer: { select: { id: true, name: true } },
  project: { select: { id: true, name: true, status: true } },
  invoices: { select: { id: true, status: true, total: true } },
};

router.get('/', auth, async (req, res) => {
  res.json(await prisma.contract.findMany({ include, orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const c = await prisma.contract.findUnique({ where: { id: +req.params.id }, include });
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

router.post('/', auth, async (req, res) => {
  res.status(201).json(await prisma.contract.create({ data: req.body, include }));
});

router.put('/:id', auth, async (req, res) => {
  const { id, customer, project, invoices, createdAt, updatedAt, financeApprovedAt, signedAt, ...data } = req.body;
  if (data.startDate === '') data.startDate = null;
  if (data.endDate === '') data.endDate = null;
  res.json(await prisma.contract.update({ where: { id: +req.params.id }, data, include }));
});

router.post('/:id/finance-approve', auth, async (req, res) => {
  const c = await prisma.contract.update({
    where: { id: +req.params.id },
    data: { status: 'FINANCE_APPROVED', financeApprovedAt: new Date() },
    include,
  });
  res.json(c);
});

router.post('/:id/sign', auth, async (req, res) => {
  const c = await prisma.contract.update({
    where: { id: +req.params.id },
    data: { status: 'SIGNED', signedAt: new Date() },
    include,
  });
  res.json(c);
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.contract.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
