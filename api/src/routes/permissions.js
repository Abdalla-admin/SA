const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

const MODULES = [
  { id: 'dashboard',      label: 'Dashboard',       group: 'Overview'     },
  { id: 'customers',      label: 'Customers',        group: 'Contacts'     },
  { id: 'vendors',        label: 'Vendors',          group: 'Contacts'     },
  { id: 'employees',      label: 'Employees',        group: 'Contacts'     },
  { id: 'leads',          label: 'Leads',            group: 'Operations'   },
  { id: 'projects',       label: 'Projects',         group: 'Operations'   },
  { id: 'materials',      label: 'Materials',        group: 'Inventory'    },
  { id: 'purchases',      label: 'Purchases',        group: 'Inventory'    },
  { id: 'assets',         label: 'Assets',           group: 'Inventory'    },
  { id: 'quotations',     label: 'Quotations',       group: 'Finance'      },
  { id: 'contracts',      label: 'Contracts',        group: 'Finance'      },
  { id: 'invoices',       label: 'Invoices',         group: 'Finance'      },
  { id: 'payments',       label: 'Payments',         group: 'Finance'      },
  { id: 'expenses',       label: 'Expenses',         group: 'Finance'      },
  { id: 'bank_accounts',  label: 'Bank Accounts',    group: 'Banking'      },
  { id: 'fund_transfers', label: 'Fund Transfers',   group: 'Banking'      },
  { id: 'warranty',       label: 'Warranty',         group: 'After-Sales'  },
  { id: 'maintenance',    label: 'Maintenance',      group: 'After-Sales'  },
  { id: 'payroll',        label: 'Payroll',          group: 'HR & Payroll' },
  { id: 'attendance',     label: 'Attendance',       group: 'HR & Payroll' },
  { id: 'leave',          label: 'Leave Requests',   group: 'HR & Payroll' },
  { id: 'reports',        label: 'Reports',          group: 'Reports'      },
  { id: 'users',          label: 'User Management',  group: 'Admin'        },
];

const SPECIAL_LABEL = {
  leads:      'Mark as Contracted',
  purchases:  'Receive Items',
  quotations: 'Convert to Invoice',
  invoices:   'Record Payment',
  payroll:    'Run Payroll',
  leave:      'Approve / Reject',
  projects:   'Add Snag / Test',
  warranty:   'Create Warranty',
};

const emptyPerm = () => ({ canView: false, canCreate: false, canEdit: false, canDelete: false, canSpecial: false });

const isAdmin = role => role === 'ADMIN' || role === 'admin';

router.get('/modules', auth, (req, res) => {
  res.json({ modules: MODULES, specialLabels: SPECIAL_LABEL });
});

router.get('/users', auth, async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const users = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

router.get('/user/:userId', auth, async (req, res) => {
  const userId = +req.params.userId;
  if (!isAdmin(req.user.role) && req.user.id !== userId)
    return res.status(403).json({ error: 'Forbidden' });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return res.status(404).json({ error: 'User not found' });

  const userPerms = await prisma.userPermission.findMany({ where: { userId } });
  const map = {};
  userPerms.forEach(p => { map[p.module] = p; });

  if (userPerms.length < MODULES.length) {
    const rolePerms = await prisma.rolePermission.findMany({ where: { role: target.role } });
    rolePerms.forEach(p => { if (!map[p.module]) map[p.module] = p; });
  }

  MODULES.forEach(m => { if (!map[m.id]) map[m.id] = { module: m.id, ...emptyPerm() }; });
  res.json(map);
});

router.put('/user/:userId', auth, async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const userId = +req.params.userId;
  const { permissions } = req.body;

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (isAdmin(target.role)) return res.status(400).json({ error: 'Cannot modify admin permissions' });

  const ops = Object.entries(permissions).map(([module, p]) =>
    prisma.userPermission.upsert({
      where:  { userId_module: { userId, module } },
      update: { canView: !!p.canView, canCreate: !!p.canCreate, canEdit: !!p.canEdit, canDelete: !!p.canDelete, canSpecial: !!p.canSpecial },
      create: { userId, module, canView: !!p.canView, canCreate: !!p.canCreate, canEdit: !!p.canEdit, canDelete: !!p.canDelete, canSpecial: !!p.canSpecial },
    })
  );
  await prisma.$transaction(ops);
  res.json({ message: 'Permissions saved' });
});

module.exports = router;
module.exports.MODULES = MODULES;
