import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const DEFAULT_CATS = ['Materials','Logistics','Labour','Equipment','Office','Utilities','Other'];
const emptyLine = () => ({ description:'', quantity:1, unitPrice:0 });
const empty = { projectId:'', bankAccountId:'', category:'', description:'', expenseDate:'', items:[emptyLine()] };
const fmt = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
  </div>
);

export default function Expenses() {
  const { confirm } = useDialog();
  const [items, setItems]           = useState([]);
  const [projects, setProjects]     = useState([]);
  const [bankAccounts, setBankAccts]= useState([]);
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState(empty);
  const [viewed, setViewed]         = useState(null);
  const [customCat, setCustomCat]   = useState(false);
  const [search, setSearch]         = useState('');

  const filtered = items.filter(e => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [e.category, e.description, e.project?.name].some(v => v?.toLowerCase().includes(q));
  });

  useEffect(() => {
    client.get('/expenses').then(r => setItems(r.data));
    client.get('/projects').then(r => setProjects(r.data));
    client.get('/bank-accounts').then(r => setBankAccts(r.data));
  }, []);

  const allCats = [...new Set([...DEFAULT_CATS, ...items.map(e => e.category).filter(Boolean)])].sort();
  const lineTotal = (lines) => lines.reduce((s, l) => s + (+l.quantity * +l.unitPrice), 0);

  const setLine = (idx, field, val) => {
    setForm(f => {
      const lines = [...f.items];
      lines[idx] = { ...lines[idx], [field]: val };
      return { ...f, items: lines };
    });
  };

  const removeLine = idx => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const openNew = () => { setForm(empty); setCustomCat(false); setModal('form'); };
  const openEdit = e => {
    setForm({
      ...e,
      projectId:     e.projectId     ? String(e.projectId)     : '',
      bankAccountId: e.bankAccountId ? String(e.bankAccountId) : '',
      expenseDate:   e.expenseDate   ? e.expenseDate.slice(0,10) : '',
      items:         e.items?.length ? e.items : [emptyLine()],
    });
    setCustomCat(!DEFAULT_CATS.includes(e.category) && !!e.category);
    setModal('form');
  };

  const save = async ev => {
    ev.preventDefault();
    const payload = {
      ...form,
      projectId:     form.projectId     ? +form.projectId     : null,
      bankAccountId: form.bankAccountId ? +form.bankAccountId : null,
      items: form.items.filter(l => l.description.trim()),
    };
    if (form.id) {
      const { data } = await client.put(`/expenses/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
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

  const total = items.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">Total: {fmt(total)}</p>
        </div>
        <button onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Expense</button>
      </div>

      <input type="text" placeholder="Search expenses..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Category','Description','Project','Amount','Account','Date','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No expenses found</td></tr>
            )}
            {filtered.map(e=>(
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">{e.category||'—'}</span></td>
                <td className="px-4 py-3 text-gray-600">{e.description || (e.items?.length ? `${e.items.length} item${e.items.length>1?'s':''}` : '—')}</td>
                <td className="px-4 py-3 text-gray-500">{e.project?.name||'—'}</td>
                <td className="px-4 py-3 font-medium text-red-600">{fmt(e.amount)}</td>
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
              <Field label="Date" value={new Date(viewed.expenseDate).toLocaleDateString()} />
              <Field label="Bank Account" value={viewed.bankAccount?.name} />
              {viewed.description && <div className="col-span-2"><Field label="Description" value={viewed.description} /></div>}
            </div>
            {viewed.items?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Line Items</p>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewed.items.map((l,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2">{l.description}</td>
                        <td className="px-3 py-2 text-right">{l.quantity}</td>
                        <td className="px-3 py-2 text-right">{fmt(l.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(l.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right mt-2 font-bold text-red-600">{fmt(viewed.amount)}</div>
              </div>
            )}
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
            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-600">Category</label>
                  <button type="button" onClick={()=>{setCustomCat(c=>!c);if(customCat)setForm(f=>({...f,category:''}));}} className="text-xs text-orange-600 hover:underline">{customCat?'↩ Pick':'+ New'}</button>
                </div>
                {customCat
                  ? <input type="text" placeholder="Custom category" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  : <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option value="">Select</option>
                      {allCats.map(c=><option key={c}>{c}</option>)}
                    </select>
                }
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" required value={form.expenseDate||''} onChange={e=>setForm(f=>({...f,expenseDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>

              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project (optional)</label>
                <select value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">No project</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
                <select value={form.bankAccountId} onChange={e=>setForm(f=>({...f,bankAccountId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select</option>
                  {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
              <input type="text" value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Items</label>
                <button type="button" onClick={()=>setForm(f=>({...f,items:[...f.items,emptyLine()]}))} className="text-xs text-orange-600 hover:underline">+ Add Line</button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-2 py-2 text-left">Item / Description</th>
                      <th className="px-2 py-2 text-right w-16">Qty</th>
                      <th className="px-2 py-2 text-right w-28">Unit Price</th>
                      <th className="px-2 py-2 text-right w-28">Total</th>
                      <th className="w-6"/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {form.items.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            placeholder="Description"
                            value={line.description}
                            onChange={e=>setLine(idx,'description',e.target.value)}
                            className="w-full border-0 focus:outline-none text-sm bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={line.quantity}
                            onChange={e=>setLine(idx,'quantity',e.target.value)}
                            className="w-full border-0 focus:outline-none text-sm text-right bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={line.unitPrice}
                            onChange={e=>setLine(idx,'unitPrice',e.target.value)}
                            className="w-full border-0 focus:outline-none text-sm text-right bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-1 text-right text-sm font-medium text-gray-700">
                          {fmt(+line.quantity * +line.unitPrice)}
                        </td>
                        <td className="px-1 py-1 text-center">
                          {form.items.length > 1 && (
                            <button type="button" onClick={()=>removeLine(idx)} className="text-red-400 hover:text-red-600 text-xs leading-none">✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right mt-2 text-sm font-bold text-gray-800">
                Total: <span className="text-red-600">{fmt(lineTotal(form.items))}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={()=>setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
