import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';

const emptyForm = { vendorId:'', bankAccountId:'', notes:'', items:[{materialId:'',quantity:1,unitCost:0,totalCost:0}] };

export default function Purchases() {
  const { confirm } = useDialog();
  const [items, setItems]         = useState([]);
  const [vendors, setVendors]     = useState([]);
  const [materials, setMaterials] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [error, setError]         = useState('');

  const load = () => client.get('/purchases').then(r => setItems(r.data));

  useEffect(() => {
    load();
    client.get('/vendors').then(r => setVendors(r.data));
    client.get('/materials').then(r => setMaterials(r.data));
    client.get('/bank-accounts').then(r => setBankAccounts(r.data));
  }, []);

  const setLineItem = (idx, field, val) => {
    setForm(f => {
      const its = [...f.items];
      its[idx] = { ...its[idx], [field]: val };
      if (field === 'quantity' || field === 'unitCost')
        its[idx].totalCost = +its[idx].quantity * +its[idx].unitCost;
      return { ...f, items: its };
    });
  };

  const poTotal = form.items.reduce((s, i) => s + (+i.quantity * +i.unitCost), 0);

  const save = async e => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await client.post('/purchases', {
        vendorId:      form.vendorId      ? +form.vendorId      : null,
        bankAccountId: form.bankAccountId ? +form.bankAccountId : null,
        notes: form.notes || null,
        items: form.items.map(i => ({
          materialId: +i.materialId,
          quantity:   +i.quantity,
          unitCost:   +i.unitCost,
          totalCost:  +i.quantity * +i.unitCost,
        })),
      });
      setItems(i => [data, ...i]);
      setForm(emptyForm);
      setModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create PO');
    }
  };

  const receive = async po => {
    const accountName = po.bankAccount?.name || 'no bank account (expense only)';
    const msg = po.bankAccountId
      ? `Receive PO-${String(po.id).padStart(4,'0')}?\n\n$ ${po.totalAmount.toLocaleString()} will be deducted from "${accountName}" and stock will be updated.`
      : `Receive PO-${String(po.id).padStart(4,'0')}?\n\nNo bank account selected — stock will be updated and expense logged only.`;
    if (!await confirm(msg, { title: 'Confirm Receive', confirmLabel: 'Receive' })) return;
    try {
      await client.post(`/purchases/${po.id}/receive`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to receive PO');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        <button onClick={() => { setForm(emptyForm); setError(''); setModal(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New PO</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['PO #','Vendor','Items','Total','Pay Account','Order Date','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No purchase orders yet</td></tr>
            )}
            {items.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">PO-{String(p.id).padStart(4,'0')}</td>
                <td className="px-4 py-3">{p.vendor?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{p.items?.length} item{p.items?.length !== 1 ? 's' : ''}</td>
                <td className="px-4 py-3 font-medium">$ {(+p.totalAmount).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                <td className="px-4 py-3 text-gray-500">{p.bankAccount?.name || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.orderDate).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                <td className="px-4 py-3">
                  {p.status !== 'RECEIVED' && p.status !== 'CANCELLED' && (
                    <button onClick={() => receive(p)} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200">Receive</button>
                  )}
                  {p.status === 'RECEIVED' && (
                    <span className="text-xs text-gray-400">
                      {p.bankAccount ? `💸 deducted from ${p.bankAccount.name}` : '📋 expense logged'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="New Purchase Order" onClose={() => setModal(false)} wide>
          <form onSubmit={save} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
                <select value={form.vendorId} onChange={e=>setForm(f=>({...f,vendorId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select vendor</option>
                  {vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pay from Bank Account</label>
                <select value={form.bankAccountId} onChange={e=>setForm(f=>({...f,bankAccountId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">No bank account (expense only)</option>
                  {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.name} — $ {(+b.balance).toLocaleString()}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-600">Line Items</label>
                <button type="button" onClick={()=>setForm(f=>({...f,items:[...f.items,{materialId:'',quantity:1,unitCost:0,totalCost:0}]}))} className="text-xs text-orange-600 hover:underline">+ Add Line</button>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-400 px-1">
                <span className="col-span-5">Material</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-2">Unit Cost</span>
                <span className="col-span-2">Total</span>
                <span className="col-span-1"></span>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <select required value={item.materialId} onChange={e=>setLineItem(idx,'materialId',e.target.value)} className="col-span-5 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select material</option>
                    {materials.map(m=><option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                  </select>
                  <input type="number" placeholder="Qty" min="0" required value={item.quantity} onChange={e=>setLineItem(idx,'quantity',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Unit Cost" min="0" step="0.01" required value={item.unitCost} onChange={e=>setLineItem(idx,'unitCost',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <div className="col-span-2 text-sm font-medium text-gray-700 text-right">
                    $ {(+item.quantity * +item.unitCost).toLocaleString('en-US',{minimumFractionDigits:2})}
                  </div>
                  <button type="button" onClick={()=>setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}))} className="col-span-1 text-red-400 hover:text-red-600 text-xs text-center">✕</button>
                </div>
              ))}
              <div className="text-right text-sm font-bold text-gray-800 mt-2 border-t pt-2">
                Total: $ {poTotal.toLocaleString('en-US',{minimumFractionDigits:2})}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Create PO</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
