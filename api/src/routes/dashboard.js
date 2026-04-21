const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const [
    totalLeads, activeProjects, totalCustomers, totalRevenue,
    leadsByStatus, projectsByStatus, lowStockMaterials, warrantyExpiringSoon,
    recentLeads, recentProjects
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.project.count({ where: { status: { notIn: ['COMPLETED', 'ON_HOLD'] } } }),
    prisma.customer.count(),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.lead.groupBy({ by: ['status'], _count: true }),
    prisma.project.groupBy({ by: ['status'], _count: true }),
    prisma.material.findMany({ where: { quantity: { lte: prisma.material.fields.minStock } }, take: 5 }),
    prisma.warranty.findMany({
      where: { endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, status: 'ACTIVE' },
      include: { project: { select: { name: true } } },
      take: 5,
    }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { customer: { select: { name: true } }, coordinator: { select: { name: true } } } }),
    prisma.project.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { customer: { select: { name: true } } } }),
  ]);

  res.json({
    stats: {
      totalLeads,
      activeProjects,
      totalCustomers,
      totalRevenue: totalRevenue._sum.amount || 0,
    },
    leadsByStatus,
    projectsByStatus,
    lowStockMaterials,
    warrantyExpiringSoon,
    recentLeads,
    recentProjects,
  });
});

module.exports = router;
