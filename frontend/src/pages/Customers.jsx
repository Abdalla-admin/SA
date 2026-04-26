import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const empty = { name:'', email:'', phone:'', address:'', siteLocation:'', registrationDate:'', notes:'' };

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
  </div>
);

export default function Customers() {
  const { confirm } = useDialog();
  const [items, setItems]   = useState([]);
  const [modal, setModal]   = useState(null); // 'form' | 'view' | null
  const [form, setForm]     = useState(empty);
  const [viewed, setViewed] = useState(null);

  useEffect(() => { client.get('/customers').then(r => setItems(r.data)); }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, registrationDate: form.registrationDate || null };
    if (form.id) {
      const { data } = await client.put(`/customers/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/customers', payload);
      setItems(i => [data, ...i]);
    }
    setModal(null);
  };

  const del = async id => {
    if (!await confirm('Delete this customer? This action cannot be undone.')) return;
    await client.delete(`/customers/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button onClick={() => { setForm(empty); setModal('form'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Customer</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Name','Email','Phone','Site Location','Registered','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(c=>(
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.email||'—'}</td>
                <td className="px-4 py-3">{c.phone||'—'}</td>
                <td className="px-4 py-3">{c.siteLocation||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.registrationDate ? new Date(c.registrationDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>{ setViewed(c); setModal('view'); }} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    <button onClick={()=>{ setForm({...c, registrationDate: c.registrationDate ? c.registrationDate.slice(0,10) : ''}); setModal('form'); }} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={()=>del(c.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title={viewed.name} onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email"             value={viewed.email} />
              <Field label="Phone"             value={viewed.phone} />
              <Field label="Site Location"     value={viewed.siteLocation} />
              <Field label="Registration Date" value={viewed.registrationDate ? new Date(viewed.registrationDate).toLocaleDateString() : null} />
              <div className="col-span-2">
                <Field label="Address" value={viewed.address} />
              </div>
              {viewed.notes && (
                <div className="col-span-2">
                  <Field label="Notes" value={viewed.notes} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>{ setForm({...viewed, registrationDate: viewed.registrationDate ? viewed.registrationDate.slice(0,10) : ''}); setModal('form'); }} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>
              <button onClick={()=>del(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id?'Edit Customer':'New Customer'} onClose={()=>setModal(null)}>
          <form onSubmit={save} className="space-y-3">
            {[['Name','name','text',true],['Email','email','email'],['Phone','phone','tel'],['Address','address','text'],['Site Location','siteLocation','text']].map(([l,k,t,req])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={!!req} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Registration Date</label>
              <input type="date" value={form.registrationDate||''} onChange={e=>setForm(f=>({...f,registrationDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
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
