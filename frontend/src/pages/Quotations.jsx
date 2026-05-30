import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';
import { boqCode } from '../utils/docCode';

const emptyItem = () => ({ materialId:'', description:'', quantity:1, unitPrice:0, total:0 });
const emptyForm = { customerId:'', projectId:'', validUntil:'', taxPct:0, subtotal:0, tax:0, total:0, notes:'', items:[emptyItem()] };

const printQuotation = (q) => {
  const code = boqCode(q.id, q.createdAt);
  const rows = (q.items||[]).map(i => `<tr><td>${i.description}</td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">$ ${(+i.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td style="text-align:right">$ ${(+i.total||+i.quantity*+i.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');
  const logo = window.location.origin + '/logo.png';
  const w = window.open('','_blank','width=800,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>${code}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;color:#333}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}td{padding:10px;border-bottom:1px solid #f3f4f6;font-size:13px}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ea580c;padding-bottom:12px;margin-bottom:20px}.co-wrap{display:flex;align-items:center;gap:10px}.company-name{font-size:20px;font-weight:bold;color:#1e3a5f}.company-tag{font-size:11px;color:#ea580c;font-weight:600}.doc-code{font-size:11px;color:#6b7280;margin-top:4px}.doc-title{font-size:22px;font-weight:bold;color:#ea580c}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:13px}.totals{text-align:right;margin-top:8px}.totals p{margin:4px 0;font-size:13px}.totals .grand{font-size:16px;font-weight:bold;color:#ea580c}@page{margin:20mm}</style>
  </head><body>
  <div class="header"><div class="co-wrap"><img src="${logo}" style="height:55px;object-fit:contain" onerror="this.style.display='none'"><div><div class="company-name">SUN ARATINGA</div><div class="company-tag">SUNLIGHT INTO ELECTRICITY</div></div></div><div style="text-align:right"><div class="doc-title">QUOTATION / BOQ</div><div class="doc-code">${code}</div></div></div>
  <div class="meta"><div><strong>Customer:</strong> ${q.customer?.name||'—'}</div><div><strong>Status:</strong> ${q.status||'—'}</div><div><strong>Valid Until:</strong> ${q.validUntil?new Date(q.validUntil).toLocaleDateString():'—'}</div></div>
  <table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals"><p>Subtotal: $ ${(+q.subtotal).toLocaleString('en-US',{minimumFractionDigits:2})}</p><p>Tax: $ ${(+q.tax).toLocaleString('en-US',{minimumFractionDigits:2})}</p><p class="grand">Total: $ ${(+q.total).toLocaleString('en-US',{minimumFractionDigits:2})}</p></div>
  ${q.notes?`<p style="margin-top:16px;font-size:12px;color:#6b7280"><strong>Notes:</strong> ${q.notes}</p>`:''}
  <script>window.print();<\/script></body></html>`);
  w.document.close();
};

export default function Quotations() {
  const { confirm } = useDialog();
  const [items, setItems]         = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects]   = useState([]);
  const [materials, setMaterials] = useState([]);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [viewed, setViewed]       = useState(null);
  const [convertId, setConvertId] = useState(null);
  const [convertDue, setConvertDue] = useState('');

  useEffect(() => {
    client.get('/quotations').then(r => setItems(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
    client.get('/projects').then(r => setProjects(r.data));
    client.get('/materials').then(r => setMaterials(r.data));
  }, []);

  const recalc = (lineItems) => {
    const sub = lineItems.reduce((s, i) => s + (+i.quantity * +i.unitPrice), 0);
    setForm(f => {
      const taxAmt = sub * (+f.taxPct / 100);
      return { ...f, items: lineItems, subtotal: sub, tax: taxAmt, total: sub + taxAmt };
    });
  };

  const setLine = (idx, field, val) => {
    const its = [...form.items];
    its[idx] = { ...its[idx], [field]: val };
    its[idx].total = +its[idx].quantity * +its[idx].unitPrice;
    recalc(its);
  };

  const pickMaterial = (idx, matId) => {
    const mat = materials.find(m => String(m.id) === matId);
    const its = [...form.items];
    its[idx] = {
      ...its[idx],
      materialId:  matId,
      description: mat ? mat.name : its[idx].description,
      unitPrice:   mat ? mat.unitCost : its[idx].unitPrice,
      total:       mat ? +its[idx].quantity * mat.unitCost : its[idx].total,
    };
    recalc(its);
  };

  const openEdit = async q => {
    const { data } = await client.get(`/quotations/${q.id}`);
    setForm({
      id: data.id,
      customerId: data.customerId || '',
      projectId:  data.projectId  || '',
      validUntil: data.validUntil ? data.validUntil.slice(0,10) : '',
      taxPct: data.subtotal > 0 ? +((+data.tax / +data.subtotal) * 100).toFixed(2) : 0,
      tax:      data.tax,
      subtotal: data.subtotal,
      total:    data.total,
      notes:    data.notes || '',
      items: data.items?.length
        ? data.items.map(i => ({ materialId: i.materialId || '', description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total }))
        : [emptyItem()],
    });
    setModal('form');
  };

  const save = async e => {
    e.preventDefault();
    const payload = {
      customerId: form.customerId ? +form.customerId : null,
      projectId:  form.projectId  ? +form.projectId  : null,
      validUntil: form.validUntil || null,
      tax:      +form.tax,
      subtotal: +form.subtotal,
      total:    +form.total,
      notes:    form.notes || null,
      items: form.items.map(i => ({
        materialId:  i.materialId ? +i.materialId : null,
        description: i.description,
        quantity:    +i.quantity,
        unitPrice:   +i.unitPrice,
        total:       +i.quantity * +i.unitPrice,
      })),
    };
    if (form.id) {
      const { data } = await client.put(`/quotations/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/quotations', payload);
      setItems(i => [data, ...i]);
    }
    setModal(null);
  };

  const del = async id => {
    if (!await confirm('Delete this quotation? This action cannot be undone.')) return;
    await client.delete(`/quotations/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
  };

  const openConvert = id => { setConvertId(id); setConvertDue(''); setModal('convert'); };
  const convert = async e => {
    e.preventDefault();
    await client.post(`/quotations/${convertId}/convert`, { dueDate: convertDue });
    client.get('/quotations').then(r => setItems(r.data));
    setModal(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <button onClick={() => { setForm(emptyForm); setModal('form'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Quotation</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Code','Customer','Project','Items','Total','Valid Until','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(q => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{boqCode(q.id, q.createdAt)}</td>
                <td className="px-4 py-3">{q.customer?.name||'—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{q.project?.name||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{q.items?.length||0} item{q.items?.length!==1?'s':''}</td>
                <td className="px-4 py-3 font-medium">$ {q.total?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{q.validUntil?new Date(q.validUntil).toLocaleDateString():'—'}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status}/></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setViewed(q); setModal('view'); }} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    {q.status!=='CONVERTED' && <button onClick={() => openEdit(q)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>}
                    {q.status!=='CONVERTED' && <button onClick={() => del(q.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>}
                    {q.status!=='CONVERTED' && <button onClick={() => openConvert(q.id)} className="px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium">→ Invoice</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Convert to Invoice Modal */}
      {modal === 'convert' && (
        <Modal title="Convert to Invoice" onClose={() => setModal(null)}>
          <form onSubmit={convert} className="space-y-4">
            <p className="text-sm text-gray-500">Inventory items in this quotation will be deducted from stock upon conversion.</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Due Date</label>
              <input type="date" value={convertDue} onChange={e => setConvertDue(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Convert & Deduct Stock</button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title={boqCode(viewed.id, viewed.createdAt)} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Customer: </span><strong>{viewed.customer?.name||'—'}</strong></div>
              <div className="flex items-center gap-2"><span className="text-gray-500">Status: </span><StatusBadge status={viewed.status}/></div>
              <div><span className="text-gray-500">Project: </span>{viewed.project?.name||'—'}</div>
              <div><span className="text-gray-500">Valid Until: </span>{viewed.validUntil?new Date(viewed.validUntil).toLocaleDateString():'—'}</div>
            </div>
            <table className="w-full text-sm border-t">
              <thead><tr className="text-gray-500 text-xs uppercase">
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-left text-xs text-gray-400">From Inventory</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr></thead>
              <tbody>
                {viewed.items?.map((item,i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-xs text-gray-400">{item.material?.name || '—'}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">$ {(+item.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                    <td className="py-2 text-right">$ {(+item.total||+item.quantity*+item.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr><td colSpan={4} className="py-2 text-right text-gray-500">Subtotal</td><td className="py-2 text-right">$ {(+viewed.subtotal).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
                <tr><td colSpan={4} className="py-2 text-right text-gray-500">Tax</td><td className="py-2 text-right">$ {(+viewed.tax).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
                <tr><td colSpan={4} className="py-2 text-right font-bold text-base">Total</td><td className="py-2 text-right font-bold text-base">$ {(+viewed.total).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
              </tfoot>
            </table>
            {viewed.notes && <p className="text-sm text-gray-500"><strong>Notes:</strong> {viewed.notes}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => printQuotation(viewed)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">🖨 Print</button>
              {viewed.status!=='CONVERTED' && <button onClick={() => openEdit(viewed)} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>}
              {viewed.status!=='CONVERTED' && <button onClick={() => del(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>}
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Edit Quotation' : 'New Quotation'} onClose={() => setModal(null)} wide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
                <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project (optional)</label>
                <select value={form.projectId || ''} onChange={e => {
                  const pid = e.target.value;
                  const proj = projects.find(p => String(p.id) === pid);
                  setForm(f => ({
                    ...f,
                    projectId: pid,
                    customerId: proj?.customer?.id ? String(proj.customer.id) : f.customerId,
                  }));
                }} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
                <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={form.taxPct} onChange={e => {
                  const pct = +e.target.value;
                  const taxAmt = +form.subtotal * (pct / 100);
                  setForm(f => ({ ...f, taxPct: pct, tax: taxAmt, total: +f.subtotal + taxAmt }));
                }} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Line Items</label>
                <button type="button" onClick={() => recalc([...form.items, emptyItem()])} className="text-xs text-orange-600 hover:underline">+ Add Item</button>
              </div>
              <div className="grid grid-cols-13 gap-1 mb-1 text-xs text-gray-400 font-medium px-1" style={{gridTemplateColumns:'repeat(13,minmax(0,1fr))'}}>
                <span className="col-span-3">Inventory Item</span>
                <span className="col-span-4">Description</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-2">Unit Price</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1"/>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid gap-1 mb-2 items-center" style={{gridTemplateColumns:'repeat(13,minmax(0,1fr))'}}>
                  <select value={item.materialId || ''} onChange={e => pickMaterial(idx, e.target.value)}
                    className="col-span-3 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50">
                    <option value="">— Custom —</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit}) — {m.quantity} left</option>)}
                  </select>
                  <input placeholder="Description" required value={item.description} onChange={e => setLine(idx, 'description', e.target.value)}
                    className="col-span-4 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" min="0.01" step="any" value={item.quantity} onChange={e => setLine(idx, 'quantity', e.target.value)}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" min="0" step="any" value={item.unitPrice} onChange={e => setLine(idx, 'unitPrice', e.target.value)}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <div className="col-span-1 text-right text-xs font-medium text-gray-700">$ {(+item.quantity * +item.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                  <button type="button" onClick={() => recalc(form.items.filter((_,i) => i !== idx))} className="col-span-1 text-red-400 text-lg text-center">×</button>
                </div>
              ))}
              <div className="text-right text-sm font-semibold text-gray-700 pt-1 border-t">Total: $ {(+form.total).toLocaleString('en-US',{minimumFractionDigits:2})}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes||''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
