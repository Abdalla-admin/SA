import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';

const emptyForm = { customerId:'', systemCapacity:'', validUntil:'', subtotal:0, tax:0, total:0, notes:'', items:[{description:'',quantity:1,unitPrice:0,total:0}] };

const printQuotation = (q) => {
  const rows = (q.items||[]).map(i => `<tr><td>${i.description}</td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">$ ${(+i.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td style="text-align:right">$ ${(+i.total||+i.quantity*+i.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');
  const w = window.open('','_blank','width=800,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>Q-${String(q.id).padStart(4,'0')}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;color:#333}h2{color:#ea580c}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}td{padding:10px;border-bottom:1px solid #f3f4f6;font-size:13px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:13px}.totals{text-align:right;margin-top:8px}.totals p{margin:4px 0;font-size:13px}.totals .grand{font-size:16px;font-weight:bold;color:#ea580c}@page{margin:20mm}</style>
  </head><body>
  <h2>Quotation Q-${String(q.id).padStart(4,'0')}</h2>
  <div class="meta"><div><strong>Customer:</strong> ${q.customer?.name||'—'}</div><div><strong>Status:</strong> ${q.status||'—'}</div><div><strong>System:</strong> ${q.systemCapacity?q.systemCapacity+' kW':'—'}</div><div><strong>Valid Until:</strong> ${q.validUntil?new Date(q.validUntil).toLocaleDateString():'—'}</div></div>
  <table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals"><p>Subtotal: $ ${(+q.subtotal).toLocaleString('en-US',{minimumFractionDigits:2})}</p><p>Tax: $ ${(+q.tax).toLocaleString('en-US',{minimumFractionDigits:2})}</p><p class="grand">Total: $ ${(+q.total).toLocaleString('en-US',{minimumFractionDigits:2})}</p></div>
  ${q.notes?`<p style="margin-top:16px;font-size:12px;color:#6b7280"><strong>Notes:</strong> ${q.notes}</p>`:''}
  <script>window.print();<\/script></body></html>`);
  w.document.close();
};

export default function Quotations() {
  const { confirm, prompt } = useDialog();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [viewed, setViewed] = useState(null);

  useEffect(() => {
    client.get('/quotations').then(r => setItems(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
  }, []);

  const recalc = (lineItems) => {
    const sub = lineItems.reduce((s,i)=>s+(+i.quantity * +i.unitPrice),0);
    setForm(f=>({...f,items:lineItems,subtotal:sub,total:sub+f.tax}));
  };

  const setLine = (idx,field,val) => {
    const its=[...form.items];
    its[idx]={...its[idx],[field]:val};
    its[idx].total=+its[idx].quantity * +its[idx].unitPrice;
    recalc(its);
  };

  const openEdit = async q => {
    const { data } = await client.get(`/quotations/${q.id}`);
    setForm({
      id: data.id,
      customerId: data.customerId || '',
      systemCapacity: data.systemCapacity || '',
      validUntil: data.validUntil ? data.validUntil.slice(0,10) : '',
      tax: data.tax,
      subtotal: data.subtotal,
      total: data.total,
      notes: data.notes || '',
      items: data.items?.length ? data.items.map(i=>({description:i.description,quantity:i.quantity,unitPrice:i.unitPrice,total:i.total})) : [{description:'',quantity:1,unitPrice:0,total:0}],
    });
    setModal('form');
  };

  const save = async e => {
    e.preventDefault();
    const payload={customerId:form.customerId?+form.customerId:null,systemCapacity:form.systemCapacity?+form.systemCapacity:null,validUntil:form.validUntil||null,tax:+form.tax,subtotal:+form.subtotal,total:+form.total,notes:form.notes||null,items:form.items.map(i=>({description:i.description,quantity:+i.quantity,unitPrice:+i.unitPrice,total:+i.quantity*+i.unitPrice}))};
    if (form.id) {
      const {data} = await client.put(`/quotations/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const {data} = await client.post('/quotations', payload);
      setItems(i => [data,...i]);
    }
    setModal(null);
  };

  const del = async id => {
    if (!await confirm('Delete this quotation? This action cannot be undone.')) return;
    await client.delete(`/quotations/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
  };

  const convert = async id => {
    const dueDate = await prompt('Enter invoice due date:', { placeholder: 'YYYY-MM-DD', title: 'Convert to Invoice' });
    if (!dueDate) return;
    await client.post(`/quotations/${id}/convert`,{dueDate});
    client.get('/quotations').then(r=>setItems(r.data));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <button onClick={()=>{setForm(emptyForm);setModal('form');}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Quotation</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['#','Customer','System','Items','Total','Valid Until','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(q=>(
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">Q-{String(q.id).padStart(4,'0')}</td>
                <td className="px-4 py-3">{q.customer?.name||'—'}</td>
                <td className="px-4 py-3">{q.systemCapacity?`${q.systemCapacity} kW`:'—'}</td>
                <td className="px-4 py-3 text-gray-500">{q.items?.length||0} item{q.items?.length!==1?'s':''}</td>
                <td className="px-4 py-3 font-medium">$ {q.total?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{q.validUntil?new Date(q.validUntil).toLocaleDateString():'—'}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status}/></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={()=>{setViewed(q);setModal('view');}} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    {q.status!=='CONVERTED'&&<button onClick={()=>openEdit(q)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>}
                    {q.status!=='CONVERTED'&&<button onClick={()=>del(q.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>}
                    {q.status!=='CONVERTED'&&<button onClick={()=>convert(q.id)} className="px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium">→ Invoice</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title={`Quotation Q-${String(viewed.id).padStart(4,'0')}`} onClose={()=>setModal(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Customer: </span><strong>{viewed.customer?.name||'—'}</strong></div>
              <div className="flex items-center gap-2"><span className="text-gray-500">Status: </span><StatusBadge status={viewed.status}/></div>
              <div><span className="text-gray-500">System: </span>{viewed.systemCapacity?`${viewed.systemCapacity} kW`:'—'}</div>
              <div><span className="text-gray-500">Valid Until: </span>{viewed.validUntil?new Date(viewed.validUntil).toLocaleDateString():'—'}</div>
            </div>
            <table className="w-full text-sm border-t">
              <thead><tr className="text-gray-500 text-xs uppercase">
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr></thead>
              <tbody>
                {viewed.items?.map((item,i)=>(
                  <tr key={i} className="border-t">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">$ {(+item.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                    <td className="py-2 text-right">$ {(+item.total||+item.quantity*+item.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr><td colSpan={3} className="py-2 text-right text-gray-500">Subtotal</td><td className="py-2 text-right">$ {(+viewed.subtotal).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
                <tr><td colSpan={3} className="py-2 text-right text-gray-500">Tax</td><td className="py-2 text-right">$ {(+viewed.tax).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
                <tr><td colSpan={3} className="py-2 text-right font-bold text-base">Total</td><td className="py-2 text-right font-bold text-base">$ {(+viewed.total).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
              </tfoot>
            </table>
            {viewed.notes && <p className="text-sm text-gray-500"><strong>Notes:</strong> {viewed.notes}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>printQuotation(viewed)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">🖨 Print</button>
              {viewed.status!=='CONVERTED'&&<button onClick={()=>openEdit(viewed)} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>}
              {viewed.status!=='CONVERTED'&&<button onClick={()=>del(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>}
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id?'Edit Quotation':'New Quotation'} onClose={()=>setModal(null)} wide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
                <select value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select</option>
                  {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">System (kW)</label>
                <input type="number" value={form.systemCapacity} onChange={e=>setForm(f=>({...f,systemCapacity:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
                <input type="date" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax ($)</label>
                <input type="number" value={form.tax} onChange={e=>setForm(f=>({...f,tax:+e.target.value,total:f.subtotal+ +e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Line Items</label>
                <button type="button" onClick={()=>recalc([...form.items,{description:'',quantity:1,unitPrice:0,total:0}])} className="text-xs text-orange-600 hover:underline">+ Add</button>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-400 font-medium px-1">
                <span className="col-span-5">Description</span><span className="col-span-2">Qty</span><span className="col-span-2">Unit Price</span><span className="col-span-2 text-right">Total</span><span className="col-span-1"/>
              </div>
              {form.items.map((item,idx)=>(
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <input placeholder="Description" required value={item.description} onChange={e=>setLine(idx,'description',e.target.value)} className="col-span-5 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e=>setLine(idx,'quantity',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Unit Price" value={item.unitPrice} onChange={e=>setLine(idx,'unitPrice',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <div className="col-span-2 text-right text-sm font-medium text-gray-700">$ {(+item.quantity * +item.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                  <button type="button" onClick={()=>recalc(form.items.filter((_,i)=>i!==idx))} className="col-span-1 text-red-400 text-lg text-center">×</button>
                </div>
              ))}
              <div className="text-right text-sm font-medium">Total: $ {form.total?.toLocaleString()}</div>
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
