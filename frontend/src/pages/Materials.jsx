import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';

const empty = { name:'', category:'', unit:'pcs', quantity:0, minStock:0, unitCost:0, brand:'', specs:'' };
const CATS = ['panels','inverters','cables','mounts','batteries','accessories','other'];

export default function Materials() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => { client.get('/materials').then(r => setItems(r.data)); }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, quantity: +form.quantity, minStock: +form.minStock, unitCost: +form.unitCost };
    if (form.id) {
      const { data } = await client.put(`/materials/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/materials', payload);
      setItems(i => [data, ...i]);
    }
    setModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
        <button onClick={() => { setForm(empty); setModal(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Material</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Name','Category','Brand','Specs','Stock','Min Stock','Unit Cost','Value','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(m=>(
              <tr key={m.id} className={`hover:bg-gray-50 ${m.quantity<=m.minStock?'bg-red-50':''}`}>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{m.category||'—'}</span></td>
                <td className="px-4 py-3 text-gray-500">{m.brand||'—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{m.specs||'—'}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${m.quantity<=m.minStock?'text-red-600':'text-gray-900'}`}>{m.quantity} {m.unit}</span>
                  {m.quantity<=m.minStock&&<span className="ml-1 text-xs text-red-500">⚠ Low</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{m.minStock} {m.unit}</td>
                <td className="px-4 py-3">$ {m.unitCost}</td>
                <td className="px-4 py-3 font-medium">$ {(m.quantity*m.unitCost).toLocaleString()}</td>
                <td className="px-4 py-3"><button onClick={()=>{setForm(m);setModal(true);}} className="text-blue-600 hover:underline text-xs">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={form.id?'Edit Material':'New Material'} onClose={()=>setModal(false)} wide>
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category||''} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            {[['Unit','unit','text'],['Brand','brand','text'],['Specs','specs','text'],['Stock','quantity','number'],['Min Stock','minStock','number'],['Unit Cost ($)','unitCost','number']].map(([l,k,t])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
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
