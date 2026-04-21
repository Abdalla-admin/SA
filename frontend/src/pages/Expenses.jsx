import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';

const CATS = ['Materials','Logistics','Labour','Equipment','Office','Utilities','Other'];
const empty = { projectId:'', bankAccountId:'', category:'', description:'', amount:0, expenseDate:'' };

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    client.get('/expenses').then(r => setItems(r.data));
    client.get('/projects').then(r => setProjects(r.data));
    client.get('/bank-accounts').then(r => setBankAccounts(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const { data } = await client.post('/expenses', { ...form, projectId: form.projectId ? +form.projectId : null, bankAccountId: form.bankAccountId ? +form.bankAccountId : null, amount: +form.amount });
    setItems(i => [data, ...i]);
    setModal(false);
  };

  const total = items.reduce((s,e)=>s+e.amount,0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">Total: $ {total.toLocaleString()}</p>
        </div>
        <button onClick={()=>{setForm(empty);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Expense</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Category','Description','Project','Amount','Account','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(e=>(
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">{e.category||'—'}</span></td>
                <td className="px-4 py-3 text-gray-600">{e.description||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{e.project?.name||'—'}</td>
                <td className="px-4 py-3 font-medium text-red-600">$ {e.amount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{e.bankAccount?.name||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(e.expenseDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Add Expense" onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project (optional)</label>
              <select value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">No project</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
              <select value={form.bankAccountId} onChange={e=>setForm(f=>({...f,bankAccountId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {[['Description','description','text'],['Amount ($)','amount','number'],['Date','expenseDate','date']].map(([l,k,t])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={k==='amount'} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
