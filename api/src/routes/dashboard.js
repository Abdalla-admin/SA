const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const [
    pendingInvoices, activeProjects, totalCustomers, totalRevenue,
    invoicesByStatus, projectsByStatus, lowStockMaterials, warrantyExpiringSoon,
    recentProjects, recentInvoices,
  ] = await Promise.all([
    prisma.invoice.count({ where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } } }),
    prisma.project.count({ where: { status: { notIn: ['COMPLETED', 'ON_HOLD'] } } }),
    prisma.customer.count(),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.invoice.groupBy({ by: ['status'], _count: true }),
    prisma.project.groupBy({ by: ['status'], _count: true }),
    prisma.material.findMany({ where: { quantity: { lte: prisma.material.fields.minStock } }, take: 5 }),
    prisma.warranty.findMany({
      where: { endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, status: 'ACTIVE' },
      include: { project: { select: { name: true } } },
      take: 5,
    }),
    prisma.project.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { customer: { select: { name: true } } } }),
    prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { customer: { select: { name: true } }, payments: true },
    }),
  ]);

  res.json({
    stats: { pendingInvoices, activeProjects, totalCustomers, totalRevenue: totalRevenue._sum.amount || 0 },
    invoicesByStatus,
    projectsByStatus,
    lowStockMaterials,
    warrantyExpiringSoon,
    recentProjects,
    recentInvoices,
  });
});

module.exports = router;
