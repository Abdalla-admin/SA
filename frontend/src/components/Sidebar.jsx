import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

const nav = [
  { section: 'Overview' },
  { to: '/',              label: 'Dashboard',      icon: '📊', module: 'dashboard' },
  { section: 'Contacts' },
  { to: '/customers',     label: 'Customers',      icon: '👤', module: 'customers' },
  { to: '/vendors',       label: 'Vendors',        icon: '🏪', module: 'vendors' },
  { to: '/employees',     label: 'Employees',      icon: '👥', module: 'employees' },
  { section: 'Operations' },
  { to: '/leads',         label: 'Site Assessments', icon: '🎯', module: 'leads' },
  { to: '/projects',      label: 'Projects',         icon: '⚡', module: 'projects' },
  { section: 'Inventory' },
  { to: '/materials',     label: 'Inventory',        icon: '🔧', module: 'materials' },
  { to: '/purchases',     label: 'Purchases',        icon: '🛒', module: 'purchases' },
  { section: 'Finance' },
  { to: '/quotations',    label: 'Quotations',       icon: '📋', module: 'quotations' },
  { to: '/invoices',      label: 'Invoices',         icon: '🧾', module: 'invoices' },
  { to: '/payments',      label: 'Payments',       icon: '💳', module: 'payments' },
  { to: '/expenses',      label: 'Expenses',       icon: '💸', module: 'expenses' },
  { section: 'Banking' },
  { to: '/bank-accounts', label: 'Bank Accounts',  icon: '🏦', module: 'bank_accounts' },
  { to: '/fund-transfers',label: 'Fund Transfers',  icon: '🔄', module: 'fund_transfers' },
  { section: 'After-Sales' },
  { to: '/warranty',      label: 'Warranty',       icon: '🛡️', module: 'warranty' },
  { to: '/maintenance',   label: 'Maintenance',    icon: '🔩', module: 'maintenance' },
  { section: 'HR & Payroll' },
  { to: '/attendance',    label: 'Attendance',     icon: '📅', module: 'attendance' },
  { to: '/leave',         label: 'Leave',          icon: '🏖️', module: 'leave' },
  { to: '/payroll',       label: 'Payroll',        icon: '💰', module: 'payroll' },
  { section: 'Reports' },
  { to: '/reports',       label: 'Reports',        icon: '📈', module: 'reports' },
  { section: 'Admin' },
  { to: '/users',         label: 'Users',          icon: '⚙️', module: 'users', adminOnly: true },
  { to: '/permissions',   label: 'Permissions',    icon: '🔐', adminOnly: true },
  { to: '/guide',         label: 'Guide',          icon: '📖' },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { canView, loading } = usePermissions();

  // Track which sections have at least one visible item
  const visibleModules = new Set();
  nav.forEach(item => {
    if (!item.to || !item.module) return;
    if (item.adminOnly && !['ADMIN', 'CEO'].includes(user?.role)) return;
    if (!item.adminOnly && !loading && !canView(item.module)) return;
    visibleModules.add(item.section || '__none__');
  });

  let lastSection = null;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-gray-900 text-white z-30 flex flex-col transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-xl">☀️</div>
          <div>
            <div className="font-bold text-orange-400 leading-tight">Sun Aratinga</div>
            <div className="text-xs text-gray-400">Solar Management</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {nav.map((item, i) => {
            if (item.section) {
              lastSection = item.section;
              return null; // rendered below alongside items
            }

            if (item.adminOnly && !['ADMIN', 'CEO'].includes(user?.role)) return null;
            if (!item.adminOnly && item.module && !loading && !canView(item.module)) return null;

            // Render section header before first visible item in each section
            const sectionHeader = lastSection;
            lastSection = null;
            return (
              <div key={item.to}>
                {sectionHeader && (
                  <div className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{sectionHeader}</div>
                )}
                <NavLink to={item.to} end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors
                    ${isActive ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`
                  }
                  onClick={onClose}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-gray-700 text-sm">
          <div className="font-medium text-white">{user?.name}</div>
          <div className="text-xs text-gray-400">{user?.role?.replace(/_/g, ' ')}</div>
        </div>
      </aside>
    </>
  );
}
