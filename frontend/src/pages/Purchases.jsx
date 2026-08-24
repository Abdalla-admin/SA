import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';
import { purCode } from '../utils/docCode';

const emptyForm = { vendorId:'', bankAccountId:'', orderDate: new Date().toISOString().split('T')[0], discount:0, notes:'', items:[{materialId:'',quantity:1,unitCost:0,totalCost:0}] };

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
  </div>
);

const printPO = (po) => {
  const code = purCode(po.id, po.createdAt || po.orderDate);
  const rows = (po.items||[]).map(i => `<tr><td>${i.material?.name||'—'} (${i.material?.unit||''})</td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">$ ${(+i.unitCost).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td style="text-align:right">$ ${(+i.totalCost).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');
  const logo = window.location.origin + '/logo.png';
  const w = window.open('','_blank','width=800,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>${code}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;color:#333}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}td{padding:10px;border-bottom:1px solid #f3f4f6;font-size:13px}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ea580c;padding-bottom:12px;margin-bottom:20px}.co-wrap{display:flex;align-items:center;gap:10px}.company-name{font-size:20px;font-weight:bold;color:#1e3a5f}.company-tag{font-size:11px;color:#ea580c;font-weight:600}.doc-code{font-size:11px;color:#6b7280;margin-top:4px}.doc-title{font-size:22px;font-weight:bold;color:#ea580c}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:13px}.total{text-align:right;font-size:16px;font-weight:bold;margin-top:8px;color:#ea580c}@page{margin:20mm}</style>
  </head><body>
  <div class="header"><div class="co-wrap"><img src="${logo}" style="height:55px;object-fit:contain" onerror="this.style.display='none'"><div><div class="company-name">SUN ARATINGA</div><div class="company-tag">SUNLIGHT INTO ELECTRICITY</div></div></div><div style="text-align:right"><div class="doc-title">PURCHASE ORDER</div><div class="doc-code">${code}</div></div></div>
  <div class="meta"><div><strong>Vendor:</strong> ${po.vendor?.name||'—'}</div><div><strong>Status:</strong> ${po.status||'—'}</div><div><strong>Order Date:</strong> ${new Date(po.orderDate).toLocaleDateString()}</div><div><strong>Bank Account:</strong> ${po.bankAccount?.name||'Cash/Expense'}</div></div>
  ${po.notes?`<p style="font-size:13px"><strong>Notes:</strong> ${po.notes}</p>`:''}
  <table><thead><tr><th>Material</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Cost</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
  ${(+po.discount)>0?`<div class="total" style="font-size:13px;font-weight:normal;color:#374151">Discount: -$ ${(+po.discount).toLocaleString('en-US',{minimumFractionDigits:2})}</div>`:''}
  <div class="total">Total: $ ${(+po.totalAmount).toLocaleString('en-US',{minimumFractionDigits:2})}</div>
  <script>window.print();<\/script></body></html>`);
  w.document.close();
};

export default function Purchases() {
  const { confirm } = useDialog();
  const [items, setItems]         = useState([]);
  const [vendors, setVendors]     = useState([]);
  const [materials, setMaterials] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal]         = useState(null); // 'form' | 'view' | null
  const [form, setForm]           = useState(emptyForm);
  const [error, setError]         = useState('');
  const [viewed, setViewed]       = useState(null);
  const [receiveModal, setReceiveModal] = useState(null);
  const [receiveDate, setReceiveDate]   = useState('');
  const [receiveError, setReceiveError] = useState('');
  const [search, setSearch]             = useState('');

  const load = () => client.get('/purchases').then(r => setItems(r.data));

  const filtered = items.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [`po-${String(p.id).padStart(4,'0')}`, p.vendor?.name, p.status, p.notes].some(v => v?.toLowerCase().includes(q));
  });

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

  const poSubtotal = form.items.reduce((s, i) => s + (+i.quantity * +i.unitCost), 0);
  const poTotal = poSubtotal - (+form.discount || 0);

  const save = async e => {
    e.preventDefault();
    setError('');
    const payload = {
      vendorId:      form.vendorId      ? +form.vendorId      : null,
      bankAccountId: form.bankAccountId ? +form.bankAccountId : null,
      orderDate: form.orderDate || null,
      discount: +form.discount || 0,
      notes: form.notes || null,
      items: form.items.map(i => ({
        materialId: +i.materialId,
        quantity:   +i.quantity,
        unitCost:   +i.unitCost,
        totalCost:  +i.quantity * +i.unitCost,
      })),
    };
    try {
      if (form.id) {
        const { data } = await client.put(`/purchases/${form.id}`, payload);
        setItems(i => i.map(x => x.id === data.id ? data : x));
      } else {
        const { data } = await client.post('/purchases', payload);
        setItems(i => [data, ...i]);
      }
      setForm(emptyForm);
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save PO');
    }
  };

  const openEdit = po => {
    setForm({
      id: po.id,
      vendorId: po.vendorId || '',
      bankAccountId: po.bankAccountId || '',
      orderDate: po.orderDate ? po.orderDate.slice(0,10) : '',
      discount: po.discount || 0,
      notes: po.notes || '',
      items: po.items.map(i => ({ materialId: i.materialId, quantity: i.quantity, unitCost: i.unitCost, totalCost: i.totalCost })),
    });
    setError('');
    setModal('form');
  };

  const openReceive = po => {
    setReceiveModal(po);
    setReceiveDate(new Date().toISOString().split('T')[0]);
    setReceiveError('');
  };

  const confirmReceive = async e => {
    e.preventDefault();
    setReceiveError('');
    try {
      await client.post(`/purchases/${receiveModal.id}/receive`, { receivedAt: receiveDate });
      setReceiveModal(null);
      load();
    } catch (err) {
      setReceiveError(err.response?.data?.error || 'Failed to receive PO');
    }
  };

  const del = async id => {
    if (!await confirm('Delete this purchase order? This action cannot be undone.')) return;
    try {
      await client.delete(`/purchases/${id}`);
      setItems(i => i.filter(x => x.id !== id));
      if (viewed?.id === id) setModal(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete purchase order');
    }
  };

  const unreceive = async po => {
    const msg = po.bankAccountId
      ? `Unreceive PO-${String(po.id).padStart(4,'0')}?\n\nStock will be reversed, the logged expense removed, and $ ${po.totalAmount.toLocaleString()} restored to "${po.bankAccount?.name}".`
      : `Unreceive PO-${String(po.id).padStart(4,'0')}?\n\nStock will be reversed and the logged expense removed.`;
    if (!await confirm(msg, { title: 'Confirm Unreceive', confirmLabel: 'Unreceive' })) return;
    try {
      await client.patch(`/purchases/${po.id}/unreceive`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unreceive PO');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        <button onClick={() => { setForm(emptyForm); setError(''); setModal('form'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New PO</button>
      </div>

      <input type="text" placeholder="Search purchase orders..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['PO #','Vendor','Items','Total','Pay Account','Order Date','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No purchase orders found</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">PO-{String(p.id).padStart(4,'0')}</td>
                <td className="px-4 py-3">{p.vendor?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{p.items?.length} item{p.items?.length !== 1 ? 's' : ''}</td>
                <td className="px-4 py-3 font-medium">$ {(+p.totalAmount).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                <td className="px-4 py-3 text-gray-500">{p.bankAccount?.name || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.orderDate).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setViewed(p); setModal('view'); }} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    {p.status !== 'RECEIVED' && (
                      <button onClick={() => openEdit(p)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    )}
                    <button onClick={() => printPO(p)} className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium">🖨 Print</button>
                    {p.status !== 'RECEIVED' && p.status !== 'CANCELLED' && (
                      <button onClick={() => openReceive(p)} className="px-3 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium">Receive</button>
                    )}
                    {p.status === 'RECEIVED' && (
                      <button onClick={() => unreceive(p)} className="px-3 py-1 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 text-xs font-medium">Unreceive</button>
                    )}
                    {p.status !== 'RECEIVED' && (
                      <button onClick={() => del(p.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title={`PO-${String(viewed.id).padStart(4,'0')}`} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vendor" value={viewed.vendor?.name} />
              <Field label="Status" value={<StatusBadge status={viewed.status}/>} />
              <Field label="Order Date" value={new Date(viewed.orderDate).toLocaleDateString()} />
              <Field label="Pay Account" value={viewed.bankAccount?.name || 'Cash/Expense'} />
              {viewed.receivedAt && <Field label="Received At" value={new Date(viewed.receivedAt).toLocaleDateString()} />}
              {viewed.notes && <Field label="Notes" value={viewed.notes} />}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Line Items</p>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>{['Material','Qty','Unit Cost','Total'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewed.items?.map(i=>(
                    <tr key={i.id}>
                      <td className="px-3 py-2">{i.material?.name} <span className="text-gray-400 text-xs">({i.material?.unit})</span></td>
                      <td className="px-3 py-2">{i.quantity}</td>
                      <td className="px-3 py-2">$ {(+i.unitCost).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                      <td className="px-3 py-2 font-medium">$ {(+i.totalCost).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right text-sm text-gray-600 mt-2 space-y-0.5">
                {+viewed.discount > 0 && (
                  <p>Discount: -$ {(+viewed.discount).toLocaleString('en-US',{minimumFractionDigits:2})}</p>
                )}
                <p className="font-bold text-gray-800">Total: $ {(+viewed.totalAmount).toLocaleString('en-US',{minimumFractionDigits:2})}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              {viewed.status !== 'RECEIVED' && (
                <button onClick={()=>openEdit(viewed)} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>
              )}
              <button onClick={()=>printPO(viewed)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium">🖨 Print</button>
              {viewed.status !== 'RECEIVED' && (
                <button onClick={()=>del(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id ? `Edit PO-${String(form.id).padStart(4,'0')}` : 'New Purchase Order'} onClose={() => setModal(null)} wide>
          <form onSubmit={save} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-3 gap-4">
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
                  {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Order Date</label>
                <input type="date" required value={form.orderDate} onChange={e=>setForm(f=>({...f,orderDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
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
                    {materials.map(m=><option key={m.id} value={m.id}>{m.name}{m.brand?` · ${m.brand}`:''}{m.specs?` — ${m.specs}`:''}</option>)}
                  </select>
                  <input type="number" placeholder="Qty" min="0" step="any" required value={item.quantity} onChange={e=>setLineItem(idx,'quantity',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Unit Cost" min="0" step="0.01" required value={item.unitCost} onChange={e=>setLineItem(idx,'unitCost',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <div className="col-span-2 text-sm font-medium text-gray-700 text-right">
                    $ {(+item.quantity * +item.unitCost).toLocaleString('en-US',{minimumFractionDigits:2})}
                  </div>
                  <button type="button" onClick={()=>setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}))} className="col-span-1 text-red-400 hover:text-red-600 text-xs text-center">✕</button>
                </div>
              ))}
              <div className="flex justify-end mt-2 border-t pt-2">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>$ {poSubtotal.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <label htmlFor="po-discount">Discount ($)</label>
                    <input id="po-discount" type="number" min="0" step="0.01" value={form.discount} onChange={e=>setForm(f=>({...f,discount:e.target.value}))} className="w-28 border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-800 border-t pt-1">
                    <span>Total</span>
                    <span>$ {poTotal.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">{form.id ? 'Save Changes' : 'Create PO'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Receive Modal */}
      {receiveModal && (
        <Modal title={`Receive PO-${String(receiveModal.id).padStart(4,'0')}`} onClose={()=>setReceiveModal(null)}>
          <form onSubmit={confirmReceive} className="space-y-4">
            {receiveError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{receiveError}</div>}
            <p className="text-sm text-gray-600">
              {receiveModal.bankAccountId
                ? `$ ${(+receiveModal.totalAmount).toLocaleString()} will be deducted from "${receiveModal.bankAccount?.name}" and stock will be updated.`
                : 'No bank account selected — stock will be updated and expense logged only.'}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Received Date</label>
              <input type="date" required value={receiveDate} onChange={e=>setReceiveDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setReceiveModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Receive</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
