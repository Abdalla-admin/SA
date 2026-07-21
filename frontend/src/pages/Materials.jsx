import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const empty = { name:'', category:'', unit:'pcs', quantity:0, minStock:0, unitCost:0, sellingPrice:0, brand:'', specs:'' };
const DEFAULT_CATS = ['panels','inverters','cables','mounts','batteries','accessories','other'];
const emptyLine = () => ({ materialId:'', quantity:'1', unitPrice:'' });
const fmtQty = n => { const num = +n; if (!num && num !== 0) return '0'; return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(4)).toString(); };

export default function Materials() {
  const { confirm } = useDialog();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(null); // null | 'form' | 'sale'
  const [form, setForm] = useState(empty);
  const [customCat, setCustomCat] = useState(false);

  // Sale state
  const [saleCustomer, setSaleCustomer] = useState('');
  const [saleLines, setSaleLines] = useState([emptyLine()]);
  const [saleDue, setSaleDue] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleError, setSaleError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    client.get('/materials').then(r => setItems(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
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

  const openSale = () => {
    setSaleCustomer('');
    setSaleLines([emptyLine()]);
    setSaleDue('');
    setSaleNotes('');
    setSaleError('');
    setModal('sale');
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

  const updateLine = (idx, field, value) => {
    setSaleLines(lines => {
      const next = [...lines];
      next[idx] = { ...next[idx], [field]: value };
      // Auto-fill unit price from material's cost when material is selected
      if (field === 'materialId' && value) {
        const mat = items.find(m => m.id === +value);
        if (mat) next[idx].unitPrice = String(mat.sellingPrice || mat.unitCost);
      }
      return next;
    });
  };

  const addLine = () => setSaleLines(l => [...l, emptyLine()]);
  const removeLine = idx => setSaleLines(l => l.filter((_, i) => i !== idx));

  const saleTotal = saleLines.reduce((sum, l) => sum + (+l.quantity || 0) * (+l.unitPrice || 0), 0);

  const submitSale = async e => {
    e.preventDefault();
    setSaleError('');
    const validLines = saleLines.filter(l => l.materialId && +l.quantity > 0 && +l.unitPrice >= 0);
    if (!validLines.length) { setSaleError('Add at least one item'); return; }
    try {
      const { data } = await client.post('/materials/sell', {
        customerId: saleCustomer,
        items: validLines.map(l => ({ materialId: l.materialId, quantity: l.quantity, unitPrice: l.unitPrice })),
        dueDate: saleDue,
        notes: saleNotes,
      });
      // Update stock for all sold materials
      data.materials.forEach(mat => setItems(i => i.map(x => x.id === mat.id ? mat : x)));
      setModal(null);
      setSuccessMsg(`Invoice #${data.invoice.id} created — $ ${data.invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setSaleError(err.response?.data?.error || 'Failed to process sale');
    }
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

  // Which material IDs are already selected in other lines
  const usedIds = saleLines.map(l => +l.materialId).filter(Boolean);

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-green-500 text-white px-5 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-white/70 hover:text-white ml-4">×</button>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex gap-2">
          <button onClick={openSale} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Sale</button>
          <button onClick={() => openForm()} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Item</button>
        </div>
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

      {/* New Sale Modal */}
      {modal === 'sale' && (
        <Modal title="New Sale" onClose={()=>setModal(null)} wide>
          <form onSubmit={submitSale} className="space-y-4">
            {saleError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saleError}</p>}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
              <select required value={saleCustomer} onChange={e=>setSaleCustomer(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select customer</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Line items */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Items</label>
              <div className="space-y-2">
                {saleLines.map((line, idx) => {
                  const mat = items.find(m => m.id === +line.materialId);
                  const lineTotal = (+line.quantity || 0) * (+line.unitPrice || 0);
                  return (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <select required value={line.materialId} onChange={e=>updateLine(idx,'materialId',e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option value="">Select item</option>
                          {items.filter(m => !usedIds.includes(m.id) || m.id === +line.materialId).map(m=>(
                            <option key={m.id} value={m.id}>{m.name}{m.brand?` · ${m.brand}`:''} — {fmtQty(m.quantity)} {m.unit} avail.</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input required type="number" min="0.01" step="0.01" max={mat?.quantity || undefined} placeholder="Qty" value={line.quantity} onChange={e=>updateLine(idx,'quantity',e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                      </div>
                      <div className="w-28">
                        <input required type="number" min="0" step="0.01" placeholder="Unit $" value={line.unitPrice} onChange={e=>updateLine(idx,'unitPrice',e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                      </div>
                      <div className="w-24 py-2 text-sm font-medium text-gray-700 text-right">
                        {lineTotal > 0 ? `$ ${lineTotal.toLocaleString('en-US',{minimumFractionDigits:2})}` : '—'}
                      </div>
                      {saleLines.length > 1 && (
                        <button type="button" onClick={()=>removeLine(idx)} className="py-2 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addLine} className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium">+ Add another item</button>
            </div>

            {saleTotal > 0 && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-gray-500">Invoice Total</span>
                <span className="text-lg font-bold text-gray-900">$ {saleTotal.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input type="date" value={saleDue} onChange={e=>setSaleDue(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={saleNotes} onChange={e=>setSaleNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1 border-t">
              <button type="button" onClick={()=>setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Confirm Sale &amp; Create Invoice</button>
            </div>
          </form>
        </Modal>
      )}

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
