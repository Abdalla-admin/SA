import { Fragment, useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

export default function Payroll() {
  const { confirm } = useDialog();
  const [items, setItems] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ month: new Date().getMonth()+1, year: new Date().getFullYear(), allowances: 0, deductions: 0 });
  const [payModal, setPayModal] = useState(null);
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payError, setPayError] = useState('');

  const load = () => client.get('/payroll').then(r => setItems(r.data));

  useEffect(() => {
    load();
    client.get('/bank-accounts').then(r => setBankAccounts(r.data));
  }, []);

  const run = async e => {
    e.preventDefault();
    await client.post('/payroll/run', { ...form, month: +form.month, year: +form.year, allowances: +form.allowances, deductions: +form.deductions });
    load();
    setModal(false);
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const openPay = p => {
    setPayModal(p);
    setPayBankAccountId('');
    setPayError('');
  };

  const savePay = async e => {
    e.preventDefault();
    setPayError('');
    try {
      await client.patch(`/payroll/${payModal.id}/pay`, { bankAccountId: +payBankAccountId });
      setPayModal(null);
      load();
    } catch (err) {
      setPayError(err.response?.data?.error || 'Failed to mark payslip paid');
    }
  };

  const unpay = async p => {
    if (!await confirm(`Undo payment for ${p.employee?.name}? This reverses the bank balance and removes the logged expense.`)) return;
    try {
      await client.patch(`/payroll/${p.id}/unpay`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to undo payment');
    }
  };

  const rollback = async (month, year) => {
    if (!await confirm(`Rollback payroll for ${months[month-1]} ${year}? This deletes all payslips generated for this period.`)) return;
    try {
      await client.delete(`/payroll/${year}/${month}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to rollback payroll');
    }
  };

  const groups = Object.values(items.reduce((acc, p) => {
    const key = `${p.year}-${p.month}`;
    if (!acc[key]) acc[key] = { month: p.month, year: p.year, payslips: [] };
    acc[key].payslips.push(p);
    return acc;
  }, {})).sort((a, b) => b.year - a.year || b.month - a.month);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <button onClick={()=>setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Run Payroll</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Employee','Period','Basic','Allowances','Deductions','Net Pay','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groups.map(g => (
              <Fragment key={`${g.year}-${g.month}`}>
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-4 py-2 font-semibold text-gray-700">{months[g.month-1]} {g.year}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={()=>rollback(g.month, g.year)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Rollback</button>
                  </td>
                </tr>
                {g.payslips.map(p=>(
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.employee?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{months[p.month-1]} {p.year}</td>
                    <td className="px-4 py-3">$ {p.basicSalary?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">+$ {p.allowances?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-500">-$ {p.deductions?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">$ {p.netPay?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.paidAt?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{p.paidAt?'Paid':'Pending'}</span>
                      {p.paidAt && p.bankAccount && <div className="text-xs text-gray-400 mt-1">{p.bankAccount.name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {!p.paidAt && <button onClick={()=>openPay(p)} className="px-3 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium">Pay</button>}
                      {p.paidAt && <button onClick={()=>unpay(p)} className="px-3 py-1 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 text-xs font-medium">Undo Payment</button>}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Run Payroll" onClose={()=>setModal(false)}>
          <form onSubmit={run} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                <select value={form.month} onChange={e=>setForm(f=>({...f,month:+e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  {months.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                <input type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:+e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            {[['Global Allowances ($)','allowances'],['Global Deductions ($)','deductions']].map(([l,k])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:+e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <p className="text-xs text-gray-400">This will generate payslips for all active employees.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Run</button>
            </div>
          </form>
        </Modal>
      )}
      {payModal && (
        <Modal title={`Pay ${payModal.employee?.name}`} onClose={()=>setPayModal(null)}>
          <form onSubmit={savePay} className="space-y-4">
            {payError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{payError}</div>}
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Period</span><span>{months[payModal.month-1]} {payModal.year}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Net Pay</span><span className="font-bold">$ {payModal.netPay?.toLocaleString()}</span></div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pay from Bank Account</label>
              <select required value={payBankAccountId} onChange={e=>setPayBankAccountId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select account</option>
                {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setPayModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Confirm Payment</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
