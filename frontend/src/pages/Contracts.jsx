import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const empty = { title:'', customerId:'', value:0, paymentTerms:'', startDate:'', endDate:'', status:'DRAFT', notes:'' };

export default function Contracts() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/contracts').then(r => setItems(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        title: form.title,
        customerId: form.customerId ? +form.customerId : null,
        value: +form.value,
        paymentTerms: form.paymentTerms || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (form.id) {
        const { data } = await client.put(`/contracts/${form.id}`, payload);
        setItems(i => i.map(x => x.id === data.id ? data : x));
      } else {
        const { data } = await client.post('/contracts', payload);
        setItems(i => [data, ...i]);
      }
      setModal(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Save failed');
    }
  };

  const action = async (id, endpoint) => {
    const { data } = await client.post(`/contracts/${id}/${endpoint}`);
    setItems(i => i.map(x => x.id === data.id ? data : x));
  };

  const canFinanceApprove = ['ADMIN','FINANCE_MANAGER','CEO'].includes(user?.role);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
        <button onClick={() => { setForm(empty); setModal(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Contract</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Title','Customer','Value','Payment Terms','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(c=>(
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.title}</td>
                <td className="px-4 py-3">{c.customer?.name||'—'}</td>
                <td className="px-4 py-3 font-medium">$ {c.value?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{c.paymentTerms||'—'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status}/></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={()=>{setForm(c);setModal(true);}} className="text-blue-600 hover:underline text-xs">Edit</button>
                    {canFinanceApprove && c.status === 'INTERNAL_REVIEW' && (
                      <button onClick={()=>action(c.id,'finance-approve')} className="text-xs bg-lime-100 text-lime-700 px-2 py-0.5 rounded-full">Finance Approve</button>
                    )}
                    {c.status === 'FINANCE_APPROVED' && (
                      <button onClick={()=>action(c.id,'sign')} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Mark Signed</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={form.id?'Edit Contract':'New Contract'} onClose={()=>{setModal(false);setError('');}} wide>
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            {error && <div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
              <select value={form.customerId||''} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Value ($)</label>
              <input type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
              <select value={form.paymentTerms||''} onChange={e=>setForm(f=>({...f,paymentTerms:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {['Cash','Milestone','Credit 30','Credit 60','Credit 90'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {['DRAFT','INTERNAL_REVIEW','FINANCE_APPROVED','SENT_TO_CLIENT','SIGNED','ACTIVE','COMPLETED','CANCELLED'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            {[['Start Date','startDate','date'],['End Date','endDate','date']].map(([l,k,t])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
