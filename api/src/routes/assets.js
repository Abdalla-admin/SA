const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  vendor:     { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  maintenanceLogs: { orderBy: { serviceDate: 'desc' } },
};

router.get('/', auth, async (req, res) => {
  res.json(await prisma.asset.findMany({ include, orderBy: { createdAt: 'desc' } }));
});

router.get('/:id', auth, async (req, res) => {
  const asset = await prisma.asset.findUnique({ where: { id: +req.params.id }, include });
  if (!asset) return res.status(404).json({ error: 'Not found' });
  res.json(asset);
});

router.post('/', auth, async (req, res) => {
  const { vendorId, assignedToId, ...data } = req.body;
  const asset = await prisma.asset.create({
    data: {
      ...data,
      vendorId: vendorId || null,
      assignedToId: assignedToId || null,
    },
    include,
  });
  res.status(201).json(asset);
});

router.put('/:id', auth, async (req, res) => {
  const { id, vendor, assignedTo, maintenanceLogs, createdAt, vendorId, assignedToId, ...data } = req.body;
  const asset = await prisma.asset.update({
    where: { id: +req.params.id },
    data: {
      ...data,
      vendorId: vendorId || null,
      assignedToId: assignedToId || null,
    },
    include,
  });
  res.json(asset);
});

router.delete('/:id', auth, async (req, res) => {
  const asset = await prisma.asset.findUnique({ where: { id: +req.params.id } });
  if (!asset) return res.status(404).json({ error: 'Not found' });
  await prisma.$transaction([
    prisma.assetMaintenance.deleteMany({ where: { assetId: asset.id } }),
    prisma.asset.delete({ where: { id: asset.id } }),
  ]);
  res.json({ success: true });
});

// Maintenance log entries
router.post('/:id/maintenance', auth, async (req, res) => {
  const assetId = +req.params.id;
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return res.status(404).json({ error: 'Not found' });
  const { description, cost, serviceDate } = req.body;
  await prisma.assetMaintenance.create({
    data: { assetId, description, cost: +cost || 0, serviceDate: serviceDate || new Date() },
  });
  res.status(201).json(await prisma.asset.findUnique({ where: { id: assetId }, include }));
});

router.delete('/:id/maintenance/:logId', auth, async (req, res) => {
  await prisma.assetMaintenance.delete({ where: { id: +req.params.logId } });
  res.json(await prisma.asset.findUnique({ where: { id: +req.params.id }, include }));
});

module.exports = router;
