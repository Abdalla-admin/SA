const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = (p) => bcrypt.hashSync(p, 10);

  // ── Users ──────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      { name: 'Admin',               email: 'admin@sunaratinga.com',    password: hash('admin123'),   role: 'ADMIN' },
      { name: 'Rami Al-Hassan',      email: 'ceo@sunaratinga.com',      password: hash('ceo123'),     role: 'CEO' },
      { name: 'Layla Mansoor',       email: 'finance@sunaratinga.com',  password: hash('finance123'), role: 'FINANCE_MANAGER' },
      { name: 'Omar Khalil',         email: 'eng@sunaratinga.com',      password: hash('eng123'),     role: 'ENGINEERING_MANAGER' },
      { name: 'Nadia Farouk',        email: 'coord@sunaratinga.com',    password: hash('coord123'),   role: 'PROJECT_COORDINATOR' },
      { name: 'Tariq Saleh',         email: 'tech@sunaratinga.com',     password: hash('tech123'),    role: 'TECHNICIAN' },
    ],
    skipDuplicates: true,
  });

  // ── Customers ──────────────────────────────────────────────────────
  await prisma.customer.createMany({
    data: [
      { name: 'Ahmed Al-Rashid',     email: 'ahmed@rashid.ae',        phone: '+971501234567', address: 'Jumeirah, Dubai', siteLocation: 'Villa, Dubai' },
      { name: 'Fatima Enterprises',  email: 'info@fatimaent.ae',      phone: '+971502345678', address: 'Al Khalidiyah, Abu Dhabi', siteLocation: 'Commercial, Abu Dhabi' },
      { name: 'Green Valley Farm',   email: 'ops@greenvalley.ae',     phone: '+971503456789', address: 'Al Ain Agricultural', siteLocation: 'Farm, Al Ain' },
      { name: 'Horizon Properties',  email: 'pm@horizonprop.ae',      phone: '+971504567890', address: 'Business Bay, Dubai', siteLocation: 'Rooftop, Dubai' },
      { name: 'Al Noor Schools',     email: 'facilities@alnoor.ae',   phone: '+971505678901', address: 'Sharjah', siteLocation: 'School Campus, Sharjah' },
    ],
    skipDuplicates: true,
  });

  // ── Vendors ────────────────────────────────────────────────────────
  await prisma.vendor.createMany({
    data: [
      { name: 'SolarTech Supplies',  category: 'panels',      email: 'sales@solartech.com',    phone: '+971504567890', address: 'JAFZA, Dubai' },
      { name: 'PowerGrid Inverters', category: 'inverters',   email: 'info@powergrid.ae',      phone: '+971505678901', address: 'KIZAD, Abu Dhabi' },
      { name: 'CableMaster UAE',     category: 'cables',      email: 'orders@cablemaster.ae',  phone: '+971506789012', address: 'Industrial Area, Sharjah' },
      { name: 'MountFast Systems',   category: 'mounting',    email: 'sales@mountfast.ae',     phone: '+971507890123', address: 'Dubai Silicon Oasis' },
      { name: 'ElecPro Trading',     category: 'accessories', email: 'trade@elecpro.ae',       phone: '+971508901234', address: 'Deira, Dubai' },
    ],
    skipDuplicates: true,
  });

  // ── Materials ──────────────────────────────────────────────────────
  await prisma.material.createMany({
    data: [
      { name: 'Solar Panel 400W',     category: 'panels',      unit: 'pcs',    quantity: 150, minStock: 20,  unitCost: 120,  brand: 'Jinko',     specs: '400W, Mono PERC, 21.3% eff.' },
      { name: 'String Inverter 10kW', category: 'inverters',   unit: 'pcs',    quantity: 20,  minStock: 5,   unitCost: 800,  brand: 'Huawei',    specs: '10kW, 3-phase, SUN2000' },
      { name: 'DC Cable 6mm²',        category: 'cables',      unit: 'meters', quantity: 2000,minStock: 500, unitCost: 1.5,  brand: 'Polycab',   specs: '6mm², UV resistant, TUV' },
      { name: 'Mounting Rail 4m',     category: 'mounts',      unit: 'pcs',    quantity: 300, minStock: 50,  unitCost: 18,   brand: 'IronRidge', specs: '4m aluminum extrusion' },
      { name: 'MC4 Connector Pair',   category: 'accessories', unit: 'pairs',  quantity: 500, minStock: 100, unitCost: 2.5,  brand: 'Stäubli',  specs: 'IP68, 1500V DC' },
      { name: 'AC Distribution Box',  category: 'electrical',  unit: 'pcs',    quantity: 15,  minStock: 5,   unitCost: 250,  brand: 'Schneider', specs: '3-phase, IP65' },
      { name: 'Solar Panel 550W',     category: 'panels',      unit: 'pcs',    quantity: 80,  minStock: 15,  unitCost: 165,  brand: 'LONGi',     specs: '550W, Bi-facial PERC' },
    ],
    skipDuplicates: true,
  });

  // ── Bank Accounts ──────────────────────────────────────────────────
  await prisma.bankAccount.createMany({
    data: [
      { name: 'Main Operations Account', bankName: 'Emirates NBD',  accountNumber: '1234567890', balance: 250000, currency: 'USD' },
      { name: 'Project Escrow',          bankName: 'ADCB',           accountNumber: '0987654321', balance: 120000, currency: 'USD' },
      { name: 'Petty Cash',              bankName: 'Cash',           accountNumber: '-',          balance: 5000,   currency: 'USD' },
    ],
    skipDuplicates: true,
  });

  // ── Employees ──────────────────────────────────────────────────────
  await prisma.employee.createMany({
    data: [
      { name: 'Khalid Al-Mansoori', position: 'Senior Technician',    department: 'Installation', salary: 4500,  joinDate: new Date('2021-03-15') },
      { name: 'Sara Ahmed',         position: 'Project Coordinator',   department: 'Operations',   salary: 5500,  joinDate: new Date('2020-07-01') },
      { name: 'James Okonkwo',      position: 'Electrical Engineer',   department: 'Engineering',  salary: 6500,  joinDate: new Date('2019-11-10') },
      { name: 'Fatima Zahra',       position: 'Accounts Executive',    department: 'Finance',      salary: 5000,  joinDate: new Date('2022-01-20') },
      { name: 'David Mensah',       position: 'Installation Technician',department: 'Installation',salary: 3800,  joinDate: new Date('2023-05-08') },
    ],
    skipDuplicates: true,
  });

  // ── Customers lookup ───────────────────────────────────────────────
  const customers = await prisma.customer.findMany();
  const cById = {};
  customers.forEach(c => { cById[c.name] = c.id; });

  // ── Leads ──────────────────────────────────────────────────────────
  await prisma.lead.createMany({
    data: [
      { title: 'Ahmed Al-Rashid Residential',     customerId: cById['Ahmed Al-Rashid'],    source: 'REFERRAL',   estimatedCapacity: 15,  proposalAmount: 28000,  status: 'SURVEY_DONE',          notes: 'Residential villa, roof mounted' },
      { title: 'Fatima Enterprises Warehouse',    customerId: cById['Fatima Enterprises'], source: 'WEBSITE',    estimatedCapacity: 50,  proposalAmount: 95000,  status: 'CEO_APPROVED',         notes: 'Commercial warehouse, large rooftop' },
      { title: 'Green Valley Farm Ground Mount',  customerId: cById['Green Valley Farm'],  source: 'EXHIBITION', estimatedCapacity: 100, proposalAmount: 180000, status: 'CONTRACTED',           notes: 'Agricultural pumping, ground mounted' },
      { title: 'Horizon Properties Rooftop',      customerId: cById['Horizon Properties'], source: 'COLD_CALL',  estimatedCapacity: 30,  proposalAmount: 55000,  status: 'PROPOSAL_SENT',       notes: 'Apartment building common areas' },
      { title: 'Al Noor Schools Campus',          customerId: cById['Al Noor Schools'],    source: 'TENDER',     estimatedCapacity: 75,  proposalAmount: 140000, status: 'CLIENT_APPROVED',     notes: 'School campus, 3 buildings' },
    ],
    skipDuplicates: true,
  });

  // ── Projects ───────────────────────────────────────────────────────
  const proj1 = await prisma.project.create({
    data: {
      name: 'Green Valley Farm Solar',
      customerId: cById['Green Valley Farm'],
      systemCapacity: 100,
      status: 'EXECUTION',
      budget: 180000,
      startDate: new Date('2024-01-10'),
      targetDate: new Date('2024-04-30'),
      progressPct: 65,
      notes: '250 panels, ground-mounted tracker system',
      milestones: {
        create: [
          { title: 'Site Survey & Assessment', dueDate: new Date('2024-01-20'), completedAt: new Date('2024-01-18') },
          { title: 'Permits & Approvals',      dueDate: new Date('2024-02-10'), completedAt: new Date('2024-02-08') },
          { title: 'Material Delivery',        dueDate: new Date('2024-02-28'), completedAt: new Date('2024-03-02') },
          { title: 'Panel Installation',       dueDate: new Date('2024-03-30') },
          { title: 'Electrical & Commissioning', dueDate: new Date('2024-04-30') },
        ],
      },
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      name: 'Al Noor Schools Campus',
      customerId: cById['Al Noor Schools'],
      systemCapacity: 75,
      status: 'DESIGN',
      budget: 140000,
      startDate: new Date('2024-03-01'),
      targetDate: new Date('2024-07-31'),
      progressPct: 20,
      notes: 'Three-building installation, shared inverter room',
      milestones: {
        create: [
          { title: 'Structural Assessment',   dueDate: new Date('2024-03-15'), completedAt: new Date('2024-03-14') },
          { title: 'Design & Engineering',    dueDate: new Date('2024-04-15') },
          { title: 'NOC from DEWA',           dueDate: new Date('2024-05-01') },
          { title: 'Installation',            dueDate: new Date('2024-06-30') },
          { title: 'Commissioning & Handover',dueDate: new Date('2024-07-31') },
        ],
      },
    },
  });

  // Add snag items to proj1
  await prisma.snagItem.createMany({
    data: [
      { projectId: proj1.id, description: 'Conduit routing adjustment at panel row 3', status: 'RESOLVED', resolvedAt: new Date('2024-03-10') },
      { projectId: proj1.id, description: 'Grounding conductor sizing discrepancy', status: 'OPEN' },
    ],
  });

  // Add commissioning tests to proj1
  await prisma.commissioningTest.createMany({
    data: [
      { projectId: proj1.id, testName: 'Insulation Resistance Test',  result: 'PASS', testedAt: new Date('2024-03-15') },
      { projectId: proj1.id, testName: 'Open Circuit Voltage Check',  result: 'PASS', testedAt: new Date('2024-03-15') },
      { projectId: proj1.id, testName: 'String Current Verification', result: 'PENDING' },
      { projectId: proj1.id, testName: 'Grid Synchronization Test',   result: 'PENDING' },
    ],
  });

  // ── Designs ────────────────────────────────────────────────────────
  await prisma.design.createMany({
    data: [
      { projectId: proj1.id, status: 'CLIENT_APPROVED', systemCapacity: 100, panelCount: 250, inverterType: 'Huawei SUN2000 10kW', mountingType: 'Ground Fixed', fileUrl: 'designs/gvf-v2.1.pdf', designNotes: 'Ground-mounted, south-facing 15° tilt' },
      { projectId: proj2.id, status: 'DRAFT',           systemCapacity: 75,  panelCount: 188, inverterType: 'Huawei SUN2000 10kW', mountingType: 'Rooftop Flush', fileUrl: 'designs/alnoor-v1.0.pdf', designNotes: '3 buildings, shared inverter room' },
    ],
    skipDuplicates: true,
  });

  // ── Quotations ────────────────────────────────────────────────────
  const q1 = await prisma.quotation.create({
    data: {
      customerId: cById['Green Valley Farm'],
      systemCapacity: 100,
      validUntil: new Date('2024-02-01'),
      subtotal: 168000,
      tax: 8400,
      total: 176400,
      status: 'CONVERTED',
      items: {
        create: [
          { description: '250x Solar Panel 400W (Jinko)', quantity: 250, unitPrice: 120, total: 30000 },
          { description: '10x String Inverter 10kW',      quantity: 10,  unitPrice: 800, total: 8000 },
          { description: 'Mounting Structure & Rails',    quantity: 1,   unitPrice: 15000, total: 15000 },
          { description: 'DC/AC Cabling & Conduit',       quantity: 1,   unitPrice: 12000, total: 12000 },
          { description: 'Labor & Installation',         quantity: 1,   unitPrice: 83000, total: 83000 },
        ],
      },
    },
  });

  const q2 = await prisma.quotation.create({
    data: {
      customerId: cById['Al Noor Schools'],
      systemCapacity: 75,
      validUntil: new Date('2024-04-30'),
      subtotal: 133000,
      tax: 6650,
      total: 139650,
      status: 'DRAFT',
      items: {
        create: [
          { description: '188x Solar Panel 400W',   quantity: 188, unitPrice: 120, total: 22560 },
          { description: '8x String Inverter 10kW', quantity: 8,   unitPrice: 800, total: 6400  },
          { description: 'Mounting & Racking',      quantity: 1,   unitPrice: 18000, total: 18000 },
          { description: 'Cabling & Protection',    quantity: 1,   unitPrice: 10000, total: 10000 },
          { description: 'Engineering & Labor',     quantity: 1,   unitPrice: 76040, total: 76040 },
        ],
      },
    },
  });

  // ── Contract ────────────────────────────────────────────────────────
  const contract1 = await prisma.contract.create({
    data: {
      customerId:   cById['Green Valley Farm'],
      title:        'SA-2024-001 – Green Valley Farm Solar',
      value:        176400,
      status:       'ACTIVE',
      signedAt:     new Date('2024-01-08'),
      paymentTerms: '40-30-30',
      notes:        '40% upfront, 30% at installation, 30% at commissioning',
    },
  });
  // Link project to contract
  await prisma.project.update({ where: { id: proj1.id }, data: { contractId: contract1.id } });

  // ── Invoices ───────────────────────────────────────────────────────
  const inv1 = await prisma.invoice.create({
    data: {
      customerId:  cById['Green Valley Farm'],
      contractId:  contract1.id,
      issueDate:   new Date('2024-01-10'),
      dueDate:     new Date('2024-01-20'),
      subtotal:    67200,
      tax:         3360,
      total:       70560,
      status:      'PAID',
      notes:       'Milestone 1: 40% advance payment',
      items: {
        create: [
          { description: 'Solar Installation – Advance Payment (40%)', quantity: 1, unitPrice: 67200, total: 67200 },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      customerId:  cById['Green Valley Farm'],
      contractId:  contract1.id,
      issueDate:   new Date('2024-03-05'),
      dueDate:     new Date('2024-03-20'),
      subtotal:    50400,
      tax:         2520,
      total:       52920,
      status:      'UNPAID',
      notes:       'Milestone 2: 30% at installation start',
      items: {
        create: [
          { description: 'Solar Installation – Progress Payment (30%)', quantity: 1, unitPrice: 50400, total: 50400 },
        ],
      },
    },
  });

  // ── Payments ───────────────────────────────────────────────────────
  const bankAcct = await prisma.bankAccount.findFirst({ where: { name: 'Main Operations Account' } });
  await prisma.payment.create({
    data: {
      invoiceId:     inv1.id,
      bankAccountId: bankAcct?.id,
      amount:        70560,
      method:        'bank_transfer',
      paidAt:        new Date('2024-01-18'),
      notes:         'Wire transfer received, ref TXN-20240118',
    },
  });

  // ── Expenses ───────────────────────────────────────────────────────
  await prisma.expense.createMany({
    data: [
      { description: 'Site Survey Equipment Rental',  category: 'operations', amount: 850,   expenseDate: new Date('2024-01-12'), projectId: proj1.id },
      { description: 'Diesel for Site Generator',    category: 'operations', amount: 420,   expenseDate: new Date('2024-02-20'), projectId: proj1.id },
      { description: 'Office Supplies & Printing',   category: 'admin',      amount: 230,   expenseDate: new Date('2024-03-01') },
      { description: 'Software Subscriptions',       category: 'admin',      amount: 299,   expenseDate: new Date('2024-03-15') },
      { description: 'Staff Training – Solar Safety',category: 'hr',         amount: 1200,  expenseDate: new Date('2024-02-05') },
    ],
    skipDuplicates: true,
  });

  // ── Warranty ───────────────────────────────────────────────────────
  // Only attach to proj1 (which is EXECUTION – will be completed)
  // Normally warranty is created when project is COMPLETED, but we add a sample
  await prisma.warranty.create({
    data: {
      projectId: proj1.id,
      startDate:  new Date('2024-05-01'),
      endDate:    new Date('2029-05-01'),
      status:     'ACTIVE',
      terms:      '5-year comprehensive warranty. Covers panel defects, inverter replacement, and labor for repair visits. 2 preventive maintenance visits per year included.',
    },
  });

  // ── Purchases ──────────────────────────────────────────────────────
  const vendors = await prisma.vendor.findMany();
  const vById = {};
  vendors.forEach(v => { vById[v.name] = v.id; });
  const materials = await prisma.material.findMany();
  const mById = {};
  materials.forEach(m => { mById[m.name] = m.id; });

  await prisma.purchase.create({
    data: {
      vendorId:    vById['SolarTech Supplies'],
      orderDate:   new Date('2024-02-15'),
      status:      'RECEIVED',
      totalAmount: 30000,
      notes:       'Bulk order for Green Valley project',
      items: {
        create: [
          { materialId: mById['Solar Panel 400W'], quantity: 250, unitCost: 120, totalCost: 30000 },
        ],
      },
    },
  });

  await prisma.purchase.create({
    data: {
      vendorId:    vById['PowerGrid Inverters'],
      orderDate:   new Date('2024-02-20'),
      status:      'ORDERED',
      totalAmount: 8000,
      notes:       'Inverters for Green Valley and Al Noor projects',
      items: {
        create: [
          { materialId: mById['String Inverter 10kW'], quantity: 10, unitCost: 800, totalCost: 8000 },
        ],
      },
    },
  });

  console.log('✅ Sun Aratinga database seeded successfully');
}

main().catch(console.error).finally(() => prisma.$disconnect());
