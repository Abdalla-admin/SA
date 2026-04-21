const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  project: { select: { id: true, name: true, customer: { select: { name: true } } } },
  warranty: { select: { id: true, status: true, endDate: true } },
};

router.get('/', auth, async (req, res) => {
  res.json(await prisma.maintenanceRequest.findMany({ include, orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const m = await prisma.maintenanceRequest.findUnique({ where: { id: +req.params.id }, include });
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

router.post('/', auth, async (req, res) => {
  // Auto-link warranty if project has one and it's active
  const { projectId, ...rest } = req.body;
  let warrantyId = rest.warrantyId;
  if (!warrantyId) {
    const warranty = await prisma.warranty.findUnique({ where: { projectId: +projectId } });
    if (warranty && warranty.status === 'ACTIVE') warrantyId = warranty.id;
  }
  res.status(201).json(await prisma.maintenanceRequest.create({ data: { ...rest, projectId: +projectId, warrantyId }, include }));
});

router.put('/:id', auth, async (req, res) => {
  res.json(await prisma.maintenanceRequest.update({ where: { id: +req.params.id }, data: req.body, include }));
});

module.exports = router;
