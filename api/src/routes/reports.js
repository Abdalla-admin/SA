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
  const { from, to, status } = req.query;
  const df = dateRange(from, to);
  const baseWhere = df ? { createdAt: df } : {};
  const where = status ? { ...baseWhere, status } : baseWhere;
  const [rawInvoices, byStatus] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        payments: { select: { amount: true } },
        items: { include: { material: { select: { unitCost: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.groupBy({ by: ['status'], _sum: { total: true }, _count: true, where: baseWhere }),
  ]);
  const invoices = rawInvoices.map(inv => {
    const cost = inv.items.reduce((s, i) => s + (i.material?.unitCost || 0) * i.quantity, 0);
    const revenue = +inv.subtotal - +(inv.discount || 0);
    return { ...inv, cost, grossProfit: revenue - cost };
  });
  const total       = invoices.reduce((s, inv) => s + inv.total, 0);
  const collected   = invoices.reduce((s, inv) => s + inv.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const totalProfit = invoices.reduce((s, inv) => s + inv.grossProfit, 0);
  res.json({ total, collected, outstanding: total - collected, totalProfit, byStatus, invoices });
});

// Expenses — by category + detailed list
router.get('/expenses', auth, async (req, res) => {
  const { from, to, category } = req.query;
  const df = dateRange(from, to);
  const where = df ? { expenseDate: df } : {};
  if (category) where.category = category;
  const [expenses, byCategory] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { project: { select: { id: true, name: true } }, items: { orderBy: { id: 'asc' } } },
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
  const { status } = req.query;
  const projects = await prisma.project.findMany({
    where: status ? { status } : undefined,
    include: {
      customer:  { select: { name: true } },
      contract:  { select: { value: true } },
      invoices:  {
        select: {
          total: true, subtotal: true, discount: true, status: true,
          payments: { select: { amount: true } },
          items: { select: { description: true, quantity: true, material: { select: { unitCost: true } } } },
        },
      },
      expenses:  { select: { amount: true } },
      warranty:  { select: { status: true, endDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects.map(p => {
    const allItems = p.invoices.flatMap(inv => inv.items);
    const cost = allItems.reduce((s, i) => s + (i.material?.unitCost || 0) * i.quantity, 0);
    const revenue = p.invoices.reduce((s, inv) => s + (+inv.subtotal - +(inv.discount || 0)), 0);
    const itemMap = {};
    allItems.forEach(i => { itemMap[i.description] = (itemMap[i.description] || 0) + i.quantity; });
    const itemsSummary = Object.entries(itemMap).map(([desc, qty]) => `${desc} ×${qty}`).join(', ');
    return {
      ...p,
      contractValue: p.budget || p.contract?.value || 0,
      totalExpenses: p.expenses.reduce((s, e) => s + e.amount, 0),
      totalInvoiced: p.invoices.reduce((s, inv) => s + inv.total, 0),
      totalCollected: p.invoices.reduce((s, inv) => s + inv.payments.reduce((ps, pay) => ps + pay.amount, 0), 0),
      grossProfit: revenue - cost,
      itemsSummary,
    };
  }));
});

// Single project financial detail — budget, invoices, expenses, gross profit per line
router.get('/projects/:id', auth, async (req, res) => {
  const id = +req.params.id;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      contract: { select: { value: true } },
      invoices: {
        select: {
          id: true, total: true, subtotal: true, discount: true, tax: true, status: true, issueDate: true, createdAt: true,
          payments: { select: { amount: true } },
          items: { select: { description: true, quantity: true, unitPrice: true, material: { select: { unitCost: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
      expenses: { select: { id: true, description: true, category: true, amount: true, expenseDate: true }, orderBy: { expenseDate: 'desc' } },
      warranty: { select: { status: true, endDate: true } },
    },
  });
  if (!project) return res.status(404).json({ error: 'Not found' });

  const lines = project.invoices.flatMap(inv =>
    inv.items.map(i => ({
      invoiceId: inv.id,
      description: i.description,
      quantity: i.quantity,
      unitCost: i.material?.unitCost || 0,
      unitPrice: i.unitPrice,
      profit: (i.unitPrice - (i.material?.unitCost || 0)) * i.quantity,
    }))
  );

  const totalInvoiced  = project.invoices.reduce((s, inv) => s + inv.total, 0);
  const totalCollected = project.invoices.reduce((s, inv) => s + inv.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const totalExpenses  = project.expenses.reduce((s, e) => s + e.amount, 0);
  const revenue = project.invoices.reduce((s, inv) => s + (+inv.subtotal - +(inv.discount || 0)), 0);
  const cogs = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
  const grossProfit = revenue - cogs;

  res.json({
    ...project,
    contractValue: project.budget || project.contract?.value || 0,
    totalInvoiced, totalCollected, totalExpenses, grossProfit,
    lines,
  });
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
