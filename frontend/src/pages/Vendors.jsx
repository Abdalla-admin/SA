import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const empty = { name:'', email:'', phone:'', address:'', category:'', notes:'' };

export default function Vendors() {
  const { confirm } = useDialog();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => { client.get('/vendors').then(r => setItems(r.data)); }, []);

  const save = async e => {
    e.preventDefault();
    if (form.id) {
      const { data } = await client.put(`/vendors/${form.id}`, form);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/vendors', form);
      setItems(i => [data, ...i]);
    }
    setModal(false);
  };

  const del = async id => {
    if (!await confirm('Delete this vendor? This action cannot be undone.')) return;
    await client.delete(`/vendors/${id}`);
    setItems(i => i.filter(x => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <button onClick={() => { setForm(empty); setModal(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Vendor</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Name','Item Description','Email','Phone','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(v=>(
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{v.category||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{v.email||'—'}</td>
                <td className="px-4 py-3">{v.phone||'—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>{setForm(v);setModal(true);}} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={()=>del(v.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={form.id?'Edit Vendor':'New Vendor'} onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {[['Name','name','text',true],['Item Description','category','text'],['Email','email','email'],['Phone','phone','tel'],['Address','address','text']].map(([l,k,t,req])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={!!req} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
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
