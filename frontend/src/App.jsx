import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import { PermissionsProvider, usePermissions } from './context/PermissionsContext';
import Layout from './components/Layout';

import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Leads        from './pages/Leads';
import Projects     from './pages/Projects';
import Customers    from './pages/Customers';
import Vendors      from './pages/Vendors';
import Employees    from './pages/Employees';
import Materials    from './pages/Materials';
import Purchases    from './pages/Purchases';
import Quotations   from './pages/Quotations';
import Invoices     from './pages/Invoices';
import Payments     from './pages/Payments';
import Expenses     from './pages/Expenses';
import BankAccounts from './pages/BankAccounts';
import FundTransfers from './pages/FundTransfers';
import Warranty     from './pages/Warranty';
import Maintenance  from './pages/Maintenance';
import Payroll      from './pages/Payroll';
import Attendance   from './pages/Attendance';
import Leave        from './pages/Leave';
import Reports      from './pages/Reports';
import Users        from './pages/Users';
import Permissions  from './pages/Permissions';
import Guide        from './pages/Guide';

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-500 text-xl">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PermGuard({ module, children }) {
  const { user } = useAuth();
  const { canView, loading } = usePermissions();
  if (loading) return null;
  if (user?.role === 'ADMIN' || canView(module)) return children;
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <p className="text-gray-500 text-sm">You don't have permission to view this page.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
      <DialogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index             element={<PermGuard module="dashboard"><Dashboard /></PermGuard>} />
            <Route path="leads"       element={<PermGuard module="leads"><Leads /></PermGuard>} />
            <Route path="projects"    element={<PermGuard module="projects"><Projects /></PermGuard>} />
            <Route path="customers"   element={<PermGuard module="customers"><Customers /></PermGuard>} />
            <Route path="vendors"     element={<PermGuard module="vendors"><Vendors /></PermGuard>} />
            <Route path="employees"   element={<PermGuard module="employees"><Employees /></PermGuard>} />
            <Route path="materials"   element={<PermGuard module="materials"><Materials /></PermGuard>} />
            <Route path="purchases"   element={<PermGuard module="purchases"><Purchases /></PermGuard>} />
            <Route path="quotations"  element={<PermGuard module="quotations"><Quotations /></PermGuard>} />
            <Route path="invoices"    element={<PermGuard module="invoices"><Invoices /></PermGuard>} />
            <Route path="payments"    element={<PermGuard module="payments"><Payments /></PermGuard>} />
            <Route path="expenses"    element={<PermGuard module="expenses"><Expenses /></PermGuard>} />
            <Route path="bank-accounts"  element={<PermGuard module="bank_accounts"><BankAccounts /></PermGuard>} />
            <Route path="fund-transfers" element={<PermGuard module="fund_transfers"><FundTransfers /></PermGuard>} />
            <Route path="warranty"    element={<PermGuard module="warranty"><Warranty /></PermGuard>} />
            <Route path="maintenance" element={<PermGuard module="maintenance"><Maintenance /></PermGuard>} />
            <Route path="payroll"     element={<PermGuard module="payroll"><Payroll /></PermGuard>} />
            <Route path="attendance"  element={<PermGuard module="attendance"><Attendance /></PermGuard>} />
            <Route path="leave"       element={<PermGuard module="leave"><Leave /></PermGuard>} />
            <Route path="reports"     element={<PermGuard module="reports"><Reports /></PermGuard>} />
            <Route path="users"       element={<Users />} />
            <Route path="permissions" element={<Permissions />} />
            <Route path="guide"       element={<Guide />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </DialogProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}
