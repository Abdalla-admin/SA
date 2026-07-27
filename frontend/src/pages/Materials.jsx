import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const empty = { name:'', category:'', unit:'pcs', quantity:0, minStock:0, unitCost:0, sellingPrice:0, brand:'', specs:'' };
const DEFAULT_CATS = ['panels','inverters','cables','mounts','batteries','accessories','other'];
const fmtQty = n => { const num = +n; if (!num && num !== 0) return '0'; return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(4)).toString(); };

export default function Materials() {
  const { confirm } = useDialog();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null); // null | 'form'
  const [form, setForm] = useState(empty);
  const [customCat, setCustomCat] = useState(false);

  useEffect(() => {
    client.get('/materials').then(r => setItems(r.data));
  }, []);

  const allCats = [...new Set([...DEFAULT_CATS, ...items.map(m => m.category).filter(Boolean)])].sort();

  const openForm = (m = null) => {
    if (m) {
      setCustomCat(m.category && !DEFAULT_CATS.includes(m.category));
      setForm(m);
    } else {
      setCustomCat(false);
      setForm(empty);
    }
    setModal('form');
  };

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, quantity: +form.quantity, minStock: +form.minStock, unitCost: +form.unitCost, sellingPrice: +form.sellingPrice };
    if (form.id) {
      const { data } = await client.put(`/materials/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/materials', payload);
      setItems(i => [data, ...i]);
    }
    setModal(null);
  };

  const del = async id => {
    if (!await confirm('Delete this item? This action cannot be undone.')) return;
    try {
      await client.delete(`/materials/${id}`);
      setItems(i => i.filter(x => x.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <button onClick={() => openForm()} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Item</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Name','Category','Brand','Specs','Stock','Min Stock','Buy Price','Sell Price','Value','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(m=>(
              <tr key={m.id} className={`hover:bg-gray-50 ${m.quantity<=m.minStock?'bg-red-50':''}`}>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{m.category||'—'}</span></td>
                <td className="px-4 py-3 text-gray-500">{m.brand||'—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{m.specs||'—'}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${m.quantity<=m.minStock?'text-red-600':'text-gray-900'}`}>{fmtQty(m.quantity)} {m.unit}</span>
                  {m.quantity<=m.minStock&&<span className="ml-1 text-xs text-red-500">⚠ Low</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{m.minStock} {m.unit}</td>
                <td className="px-4 py-3 text-gray-500">$ {m.unitCost}</td>
                <td className="px-4 py-3 font-medium text-orange-600">$ {m.sellingPrice || '—'}</td>
                <td className="px-4 py-3 font-medium">$ {(m.quantity*m.unitCost).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>openForm(m)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={()=>del(m.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modal === 'form' && (
        <Modal title={form.id?'Edit Item':'New Item'} onClose={()=>setModal(null)} wide>
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              {customCat ? (
                <div className="flex gap-2">
                  <input value={form.category||''} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="Enter category" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <button type="button" onClick={()=>{setCustomCat(false);setForm(f=>({...f,category:''}));}} className="text-xs text-gray-500 hover:text-gray-700 px-2">↩ Pick</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select value={form.category||''} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select</option>
                    {allCats.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <button type="button" onClick={()=>setCustomCat(true)} className="text-xs text-orange-600 hover:text-orange-700 px-2 whitespace-nowrap">+ New</button>
                </div>
              )}
            </div>
            {[['Unit','unit','text'],['Brand','brand','text'],['Specs','specs','text'],['Stock','quantity','number'],['Min Stock','minStock','number'],['Purchase Cost ($)','unitCost','number'],['Selling Price ($)','sellingPrice','number']].map(([l,k,t])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
