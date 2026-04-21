const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const dateRange = (from, to) =>
  from && to ? { gte: new Date(from), lte: new Date(to) } : undefined;

// P&L — summary + detailed lists
router.get('/pl', auth, async (req, res) => {
  const { from, to } = req.query;
  const df = dateRange(from, to);
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: df ? { paidAt: df } : {},
      include: { invoice: { select: { id: true, customer: { select: { name: true } } } } },
      orderBy: { paidAt: 'desc' },
    }),
    prisma.expense.findMany({
      where: df ? { expenseDate: df } : {},
      include: { project: { select: { id: true, name: true } } },
      orderBy: { expenseDate: 'desc' },
    }),
  ]);
  const totalRevenue  = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  res.json({ totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, payments, expenses });
});

// Cash Flow
router.get('/cashflow', auth, async (req, res) => {
  const { from, to } = req.query;
  const df = dateRange(from, to);
  const [paymentsAgg, expensesAgg] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: df ? { paidAt: df } : {} }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: df ? { expenseDate: df } : {} }),
  ]);
  const totalIn  = paymentsAgg._sum.amount  || 0;
  const totalOut = expensesAgg._sum.amount  || 0;
  res.json({ totalIn, totalOut, net: totalIn - totalOut });
});

// Sales — invoices by status + list
router.get('/sales', auth, async (req, res) => {
  const { from, to } = req.query;
  const df = dateRange(from, to);
  const where = df ? { createdAt: df } : {};
  const [invoices, byStatus] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { name: true } }, payments: { select: { amount: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.groupBy({ by: ['status'], _sum: { total: true }, _count: true, where }),
  ]);
  const total = invoices.reduce((s, inv) => s + inv.total, 0);
  res.json({ total, byStatus, invoices });
});

// Expenses — by category + detailed list
router.get('/expenses', auth, async (req, res) => {
  const { from, to } = req.query;
  const df = dateRange(from, to);
  const where = df ? { expenseDate: df } : {};
  const [expenses, byCategory] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: true,
      where,
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  res.json({ total, byCategory, expenses });
});

// Projects financials
router.get('/projects', auth, async (req, res) => {
  const projects = await prisma.project.findMany({
    include: {
      customer:  { select: { name: true } },
      contract:  { select: { value: true, invoices: { select: { total: true, status: true } } } },
      expenses:  { select: { amount: true } },
      warranty:  { select: { status: true, endDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects.map(p => ({
    ...p,
    contractValue:   p.contract?.value || 0,
    totalExpenses:   p.expenses.reduce((s, e) => s + e.amount, 0),
    totalInvoiced:   (p.contract?.invoices || []).reduce((s, inv) => s + inv.total, 0),
  })));
});

// Inventory
router.get('/inventory', auth, async (req, res) => {
  const materials = await prisma.material.findMany({ orderBy: { category: 'asc' } });
  res.json(materials.map(m => ({ ...m, totalValue: m.quantity * m.unitCost, lowStock: m.quantity <= m.minStock })));
});

// Payroll by month
router.get('/payroll', auth, async (req, res) => {
  const payslips = await prisma.payslip.findMany({
    include: { employee: { select: { id: true, name: true, position: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  const grouped = {};
  payslips.forEach(p => {
    const key = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!grouped[key]) grouped[key] = { key, month: p.month, year: p.year, payslips: [], total: 0 };
    grouped[key].payslips.push(p);
    grouped[key].total += p.netPay;
  });
  res.json(Object.values(grouped).sort((a, b) => b.key.localeCompare(a.key)));
});

// Leads pipeline
router.get('/leads', auth, async (req, res) => {
  const [total, byStatus, bySource] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ['status'], _count: true, _sum: { proposalAmount: true } }),
    prisma.lead.groupBy({ by: ['source'], _count: true }),
  ]);
  const pipeline = await prisma.lead.aggregate({ _sum: { proposalAmount: true }, where: { status: { notIn: ['LOST','CONTRACTED'] } } });
  res.json({ total, byStatus, bySource, pipelineValue: pipeline._sum.proposalAmount || 0 });
});

// Warranty
router.get('/warranty', auth, async (req, res) => {
  const warranties = await prisma.warranty.findMany({
    include: { project: { include: { customer: { select: { name: true } } } }, maintenanceRequests: { select: { id: true, status: true } } },
    orderBy: { endDate: 'asc' },
  });
  res.json(warranties);
});

module.exports = router;
