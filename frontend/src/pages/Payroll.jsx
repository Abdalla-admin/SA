import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';

export default function Payroll() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ month: new Date().getMonth()+1, year: new Date().getFullYear(), allowances: 0, deductions: 0 });

  useEffect(() => { client.get('/payroll').then(r => setItems(r.data)); }, []);

  const run = async e => {
    e.preventDefault();
    const { data } = await client.post('/payroll/run', { ...form, month: +form.month, year: +form.year, allowances: +form.allowances, deductions: +form.deductions });
    client.get('/payroll').then(r => setItems(r.data));
    setModal(false);
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <button onClick={()=>setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Run Payroll</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Employee','Period','Basic','Allowances','Deductions','Net Pay','Status'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(p=>(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.employee?.name}</td>
                <td className="px-4 py-3 text-gray-500">{months[p.month-1]} {p.year}</td>
                <td className="px-4 py-3">$ {p.basicSalary?.toLocaleString()}</td>
                <td className="px-4 py-3 text-green-600">+$ {p.allowances?.toLocaleString()}</td>
                <td className="px-4 py-3 text-red-500">-$ {p.deductions?.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold">$ {p.netPay?.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${p.paidAt?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{p.paidAt?'Paid':'Pending'}</span></td>
              </tr>
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
    </div>
  );
}
