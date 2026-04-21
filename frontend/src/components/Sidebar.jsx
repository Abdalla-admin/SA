import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { section: 'Overview' },
  { to: '/',              label: 'Dashboard',      icon: '📊' },
  { section: 'Contacts' },
  { to: '/customers',     label: 'Customers',      icon: '👤' },
  { to: '/vendors',       label: 'Vendors',        icon: '🏪' },
  { to: '/employees',     label: 'Employees',      icon: '👥' },
  { section: 'Operations' },
  { to: '/leads',         label: 'Leads',          icon: '🎯' },
  { to: '/projects',      label: 'Projects',       icon: '⚡' },
  { section: 'Inventory' },
  { to: '/materials',     label: 'Materials',      icon: '🔧' },
  { to: '/purchases',     label: 'Purchases',      icon: '🛒' },
  { section: 'Finance' },
  { to: '/quotations',    label: 'Quotations',     icon: '📋' },
  { to: '/contracts',     label: 'Contracts',      icon: '📝' },
  { to: '/invoices',      label: 'Invoices',       icon: '🧾' },
  { to: '/payments',      label: 'Payments',       icon: '💳' },
  { to: '/expenses',      label: 'Expenses',       icon: '💸' },
  { section: 'Banking' },
  { to: '/bank-accounts', label: 'Bank Accounts',  icon: '🏦' },
  { to: '/fund-transfers',label: 'Fund Transfers',  icon: '🔄' },
  { section: 'After-Sales' },
  { to: '/warranty',      label: 'Warranty',       icon: '🛡️' },
  { to: '/maintenance',   label: 'Maintenance',    icon: '🔩' },
  { section: 'HR & Payroll' },
  { to: '/attendance',    label: 'Attendance',     icon: '📅' },
  { to: '/leave',         label: 'Leave',          icon: '🏖️' },
  { to: '/payroll',       label: 'Payroll',        icon: '💰' },
  { section: 'Reports' },
  { to: '/reports',       label: 'Reports',        icon: '📈' },
  { section: 'Admin' },
  { to: '/users',         label: 'Users',          icon: '⚙️', adminOnly: true },
  { to: '/guide',         label: 'Guide',          icon: '📖' },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
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
            if (item.section) return (
              <div key={i} className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.section}</div>
            );
            if (item.adminOnly && !['ADMIN', 'CEO'].includes(user?.role)) return null;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors
                  ${isActive ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`
                }
                onClick={onClose}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
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
