const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth, role } = require('../middleware/auth');

const SYSTEM_ROLES = [
  { name: 'ADMIN',                color: '#ef4444' },
  { name: 'CEO',                  color: '#a855f7' },
  { name: 'FINANCE_MANAGER',      color: '#3b82f6' },
  { name: 'ENGINEERING_MANAGER',  color: '#6366f1' },
  { name: 'PROJECT_COORDINATOR',  color: '#06b6d4' },
  { name: 'ACCOUNTANT',           color: '#14b8a6' },
  { name: 'TECHNICIAN',           color: '#22c55e' },
];

router.get('/', auth, async (req, res) => {
  const custom = await prisma.customRole.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ system: SYSTEM_ROLES, custom });
});

router.post('/', auth, role('ADMIN'), async (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const upper = name.trim().toUpperCase().replace(/\s+/g, '_');
  if (SYSTEM_ROLES.find(r => r.name === upper)) return res.status(400).json({ error: 'Name conflicts with a system role' });
  const r = await prisma.customRole.create({ data: { name: upper, color: color || '#6b7280' } });
  res.status(201).json(r);
});

router.delete('/:id', auth, role('ADMIN'), async (req, res) => {
  await prisma.customRole.delete({ where: { id: +req.params.id } });
  res.json({ success: true });
});

module.exports = router;
