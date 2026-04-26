import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const DEFAULT_CATS = ['Materials','Logistics','Labour','Equipment','Office','Utilities','Other'];
const empty = { projectId:'', bankAccountId:'', category:'', description:'', amount:0, expenseDate:'' };

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
  </div>
);

export default function Expenses() {
  const { confirm } = useDialog();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [viewed, setViewed] = useState(null);
  const [customCat, setCustomCat] = useState(false);

  useEffect(() => {
    client.get('/expenses').then(r => setItems(r.data));
    client.get('/projects').then(r => setProjects(r.data));
    client.get('/bank-accounts').then(r => setBankAccounts(r.data));
  }, []);

  const allCats = [...new Set([...DEFAULT_CATS, ...items.map(e => e.category).filter(Boolean)])].sort();

  const openNew = () => { setForm(empty); setCustomCat(false); setModal('form'); };
  const openEdit = e => {
    setForm({ ...e, projectId: e.projectId ? String(e.projectId) : '', bankAccountId: e.bankAccountId ? String(e.bankAccountId) : '', expenseDate: e.expenseDate ? e.expenseDate.slice(0,10) : '' });
    setCustomCat(!DEFAULT_CATS.includes(e.category) && !!e.category);
    setModal('form');
  };

  const save = async ev => {
    ev.preventDefault();
    const payload = { ...form, projectId: form.projectId ? +form.projectId : null, bankAccountId: form.bankAccountId ? +form.bankAccountId : null, amount: +form.amount };
    if (form.id) {
      const { data } = await client.put(`/expenses/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? { ...x, ...data } : x));
    } else {
      const { data } = await client.post('/expenses', payload);
      setItems(i => [data, ...i]);
    }
    setModal(null);
  };

  const voidExpense = async id => {
    if (!await confirm('Void this expense? The bank balance will be reversed.')) return;
    await client.delete(`/expenses/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
  };

  const total = items.reduce((s,e)=>s+e.amount,0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">Total: $ {total.toLocaleString()}</p>
        </div>
        <button onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Expense</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Category','Description','Project','Amount','Account','Date','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
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
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>{setViewed(e);setModal('view');}} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    <button onClick={()=>openEdit(e)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={()=>voidExpense(e.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Void</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title="Expense Details" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" value={viewed.category} />
              <Field label="Project" value={viewed.project?.name} />
              <div>
                <p className="text-xs text-gray-400">Amount</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">$ {viewed.amount?.toLocaleString()}</p>
              </div>
              <Field label="Date" value={new Date(viewed.expenseDate).toLocaleDateString()} />
              <Field label="Bank Account" value={viewed.bankAccount?.name} />
              {viewed.description && <div className="col-span-2"><Field label="Description" value={viewed.description} /></div>}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>openEdit(viewed)} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>
              <button onClick={()=>voidExpense(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Void</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Edit Expense' : 'Add Expense'} onClose={()=>setModal(null)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-600">Category</label>
                <button type="button" onClick={()=>{setCustomCat(c=>!c);if(customCat)setForm(f=>({...f,category:''}));}} className="text-xs text-orange-600 hover:underline">{customCat?'↩ Pick':'+ New'}</button>
              </div>
              {customCat ? (
                <input type="text" placeholder="Enter custom category" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              ) : (
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select</option>
                  {allCats.map(c=><option key={c}>{c}</option>)}
                </select>
              )}
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
              <button type="button" onClick={()=>setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
