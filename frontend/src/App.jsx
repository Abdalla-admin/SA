import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
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
import Contracts    from './pages/Contracts';
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
import Guide        from './pages/Guide';

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-500 text-xl">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index          element={<Dashboard />} />
            <Route path="leads"       element={<Leads />} />
            <Route path="projects"    element={<Projects />} />
            <Route path="customers"   element={<Customers />} />
            <Route path="vendors"     element={<Vendors />} />
            <Route path="employees"   element={<Employees />} />
            <Route path="materials"   element={<Materials />} />
            <Route path="purchases"   element={<Purchases />} />
            <Route path="quotations"  element={<Quotations />} />
            <Route path="contracts"   element={<Contracts />} />
            <Route path="invoices"    element={<Invoices />} />
            <Route path="payments"    element={<Payments />} />
            <Route path="expenses"    element={<Expenses />} />
            <Route path="bank-accounts" element={<BankAccounts />} />
            <Route path="fund-transfers" element={<FundTransfers />} />
            <Route path="warranty"    element={<Warranty />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="payroll"     element={<Payroll />} />
            <Route path="attendance"  element={<Attendance />} />
            <Route path="leave"       element={<Leave />} />
            <Route path="reports"     element={<Reports />} />
            <Route path="users"       element={<Users />} />
            <Route path="guide"       element={<Guide />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  );
}
