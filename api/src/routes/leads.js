const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const include = {
  customer: { select: { id: true, name: true, phone: true } },
  coordinator: { select: { id: true, name: true } },
  project: { select: { id: true, name: true, status: true } },
};

router.get('/', auth, async (req, res) => {
  const leads = await prisma.lead.findMany({ include, orderBy: { createdAt: 'desc' } });
  res.json(leads);
});

router.get('/:id', auth, async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: +req.params.id }, include });
  if (!lead) return res.status(404).json({ error: 'Not found' });
  res.json(lead);
});

router.post('/', auth, async (req, res) => {
  const lead = await prisma.lead.create({ data: req.body, include });
  res.status(201).json(lead);
});

router.put('/:id', auth, async (req, res) => {
  const existing = await prisma.lead.findUnique({ where: { id: +req.params.id }, include: { project: true } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { id, customer, coordinator, project, createdAt, updatedAt, ...data } = req.body;
  const lead = await prisma.lead.update({ where: { id: existing.id }, data, include });

  if (req.body.status === 'CONTRACTED' && !existing.project) {
    await prisma.project.create({
      data: {
        name: existing.title,
        leadId: existing.id,
        customerId: existing.customerId || undefined,
        systemCapacity: existing.estimatedCapacity || undefined,
        budget: existing.proposalAmount || undefined,
        status: 'PLANNING',
      },
    });
    const refreshed = await prisma.lead.findUnique({ where: { id: existing.id }, include });
    return res.json(refreshed);
  }

  res.json(lead);
});

// CEO approval
router.post('/:id/ceo-approve', auth, async (req, res) => {
  const lead = await prisma.lead.update({
    where: { id: +req.params.id },
    data: { status: 'CEO_APPROVED', ceoApprovedAt: new Date(), ceoApprovedBy: req.user.name },
    include,
  });
  res.json(lead);
});

// CEO reject → back to proposal sent
router.post('/:id/ceo-reject', auth, async (req, res) => {
  const lead = await prisma.lead.update({
    where: { id: +req.params.id },
    data: { status: 'PROPOSAL_SENT', notes: req.body.reason },
    include,
  });
  res.json(lead);
});

// Client approval → mark as contracted and auto-create project
router.post('/:id/client-approve', auth, async (req, res) => {
  const existing = await prisma.lead.findUnique({ where: { id: +req.params.id }, include: { project: true } });
  if (!existing) return res.status(404).json({ error: 'Lead not found' });

  const [lead] = await prisma.$transaction([
    prisma.lead.update({
      where: { id: existing.id },
      data: { status: 'CONTRACTED', clientApprovedAt: new Date() },
      include,
    }),
    ...(!existing.project ? [
      prisma.project.create({
        data: {
          name: existing.title,
          leadId: existing.id,
          customerId: existing.customerId || undefined,
          systemCapacity: existing.estimatedCapacity || undefined,
          budget: existing.proposalAmount || undefined,
          status: 'PLANNING',
        },
      }),
    ] : []),
  ]);
  res.json(lead);
});

router.delete('/:id', auth, async (req, res) => {
  await prisma.lead.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
