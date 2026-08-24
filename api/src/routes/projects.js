const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  customer: { select: { id: true, name: true } },
  lead: { select: { id: true, title: true, source: true, estimatedCapacity: true, proposalAmount: true, surveyNotes: true, status: true } },
  contract: { select: { id: true, title: true, value: true } },
  design: true,
  milestones: true,
  snagItems: true,
  commissioningTests: true,
  warranty: true,
  materialAllocations: { include: { material: { select: { id: true, name: true, unit: true } } } },
  invoices: { include: { payments: true }, orderBy: { createdAt: 'desc' } },
  expenses: { include: { bankAccount: { select: { id: true, name: true } } }, orderBy: { expenseDate: 'desc' } },
};

router.get('/', auth, async (req, res) => {
  const projects = await prisma.project.findMany({ include, orderBy: { createdAt: 'desc' } });
  res.json(projects);
});

router.get('/:id', auth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: +req.params.id }, include });
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.post('/', auth, async (req, res) => {
  const { milestones, warrantyStartDate, warrantyEndDate, warrantyTerms, warrantyMaintenancePeriod, ...data } = req.body;
  const project = await prisma.project.create({
    data: { ...data, milestones: milestones ? { create: milestones } : undefined },
    include,
  });
  if (warrantyStartDate && warrantyEndDate) {
    await prisma.warranty.create({
      data: { projectId: project.id, startDate: new Date(warrantyStartDate), endDate: new Date(warrantyEndDate), terms: warrantyTerms || null, maintenancePeriod: warrantyMaintenancePeriod || null },
    });
    const refreshed = await prisma.project.findUnique({ where: { id: project.id }, include });
    return res.status(201).json(refreshed);
  }
  res.status(201).json(project);
});

router.put('/:id', auth, async (req, res) => {
  const { id, milestones, customer, lead, contract, design, snagItems, commissioningTests, warranty, materialAllocations, createdAt, updatedAt, warrantyStartDate, warrantyEndDate, warrantyTerms, warrantyMaintenancePeriod, ...data } = req.body;
  const project = await prisma.project.update({ where: { id: +req.params.id }, data, include });
  if (warrantyStartDate && warrantyEndDate) {
    await prisma.warranty.upsert({
      where: { projectId: +req.params.id },
      update: { startDate: new Date(warrantyStartDate), endDate: new Date(warrantyEndDate), terms: warrantyTerms || null, maintenancePeriod: warrantyMaintenancePeriod || null },
      create: { projectId: +req.params.id, startDate: new Date(warrantyStartDate), endDate: new Date(warrantyEndDate), terms: warrantyTerms || null, maintenancePeriod: warrantyMaintenancePeriod || null },
    });
    const refreshed = await prisma.project.findUnique({ where: { id: +req.params.id }, include });
    return res.json(refreshed);
  }
  res.json(project);
});

// Milestone endpoints
router.post('/:id/milestones', auth, async (req, res) => {
  const milestone = await prisma.milestone.create({ data: { ...req.body, projectId: +req.params.id } });
  res.status(201).json(milestone);
});

router.put('/:id/milestones/:mid', auth, async (req, res) => {
  const milestone = await prisma.milestone.update({ where: { id: +req.params.mid }, data: req.body });
  res.json(milestone);
});

// Snag list
router.post('/:id/snags', auth, async (req, res) => {
  const snag = await prisma.snagItem.create({ data: { ...req.body, projectId: +req.params.id } });
  res.status(201).json(snag);
});

router.put('/:id/snags/:sid', auth, async (req, res) => {
  const snag = await prisma.snagItem.update({ where: { id: +req.params.sid }, data: req.body });
  res.json(snag);
});

// Commissioning tests
router.post('/:id/tests', auth, async (req, res) => {
  const test = await prisma.commissioningTest.create({ data: { ...req.body, projectId: +req.params.id } });
  res.status(201).json(test);
});

router.put('/:id/tests/:tid', auth, async (req, res) => {
  const test = await prisma.commissioningTest.update({ where: { id: +req.params.tid }, data: req.body });
  res.json(test);
});

// Allocate material to project
router.post('/:id/materials', auth, async (req, res) => {
  const { materialId, quantity, notes } = req.body;
  const mat = await prisma.material.findUnique({ where: { id: materialId } });
  if (!mat || mat.quantity < quantity) return res.status(400).json({ error: 'Insufficient stock' });
  const [allocation] = await prisma.$transaction([
    prisma.materialAllocation.create({ data: { projectId: +req.params.id, materialId, quantity, notes } }),
    prisma.material.update({ where: { id: materialId }, data: { quantity: { decrement: quantity } } }),
  ]);
  res.status(201).json(allocation);
});

router.delete('/:id', auth, async (req, res) => {
  const id = +req.params.id;
  // Clear nullable FKs then delete project + its owned records
  await prisma.$transaction([
    prisma.invoice.updateMany({ where: { projectId: id }, data: { projectId: null } }),
    prisma.quotation.updateMany({ where: { projectId: id }, data: { projectId: null } }),
    prisma.expense.updateMany({ where: { projectId: id }, data: { projectId: null } }),
    prisma.maintenanceRequest.deleteMany({ where: { projectId: id } }),
    prisma.warranty.deleteMany({ where: { projectId: id } }),
    prisma.commissioningTest.deleteMany({ where: { projectId: id } }),
    prisma.snagItem.deleteMany({ where: { projectId: id } }),
    prisma.milestone.deleteMany({ where: { projectId: id } }),
    prisma.materialAllocation.deleteMany({ where: { projectId: id } }),
    prisma.design.deleteMany({ where: { projectId: id } }),
    prisma.project.delete({ where: { id } }),
  ]);
  res.json({ success: true });
});

module.exports = router;
