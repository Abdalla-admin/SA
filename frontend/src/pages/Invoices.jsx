import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { invCode } from '../utils/docCode';

const emptyItem = () => ({ materialId:'', description:'', quantity:1, unitPrice:0 });
const emptyForm = { customerId:'', contractId:'', projectId:'', dueDate:'', taxPct:0, subtotal:0, tax:0, total:0, notes:'', items:[emptyItem()] };
const emptyPay  = { amount:'', method:'bank_transfer', bankAccountId:'', paidAt:'', notes:'' };
const fmt = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });

export default function Invoices() {
  const [items, setItems]           = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [projects, setProjects]     = useState([]);
  const [materials, setMaterials]   = useState([]);
  const [bankAccounts, setBankAccts]= useState([]);
  const [statusFilter, setStatus]   = useState('');
  const [modal, setModal]           = useState(false);
  const [viewModal, setViewModal]   = useState(null);
  const [payModal, setPayModal]     = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [payForm, setPayForm]       = useState(emptyPay);
  const [payError, setPayError]     = useState('');

  const load = () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    client.get(`/invoices${params}`).then(r => setItems(r.data));
  };

  const voidInvoice = async inv => {
    const { data } = await client.patch(`/invoices/${inv.id}/void`);
    setItems(i => i.map(x => x.id === data.id ? data : x));
    if (viewModal?.id === inv.id) setViewModal(data);
  };

  const printInvoice = (inv) => {
    const code = invCode(inv.id, inv.createdAt || inv.issueDate);
    const rows = (inv.items||[]).map(i => `<tr><td>${i.description}</td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">$ ${(+i.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td style="text-align:right">$ ${(+(i.total||i.quantity*i.unitPrice)).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');
    const w = window.open('','_blank','width=800,height=600');
    const logo = window.location.origin + '/logo.png';
    w.document.write(`<!DOCTYPE html><html><head><title>${code}</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;color:#333}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}td{padding:10px;border-bottom:1px solid #f3f4f6;font-size:13px}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ea580c;padding-bottom:12px;margin-bottom:20px}.co-wrap{display:flex;align-items:center;gap:10px}.company-name{font-size:20px;font-weight:bold;color:#1e3a5f}.company-tag{font-size:11px;color:#ea580c;font-weight:600}.doc-code{font-size:11px;color:#6b7280;margin-top:4px}.doc-title{font-size:22px;font-weight:bold;color:#ea580c}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:13px}.totals{text-align:right;margin-top:8px}.totals p{margin:4px 0;font-size:13px}.totals .grand{font-size:16px;font-weight:bold;color:#ea580c}@page{margin:20mm}</style>
    </head><body>
    <div class="header"><div class="co-wrap"><img src="${logo}" style="height:55px;object-fit:contain" onerror="this.style.display='none'"><div><div class="company-name">SUN ARATINGA</div><div class="company-tag">SUNLIGHT INTO ELECTRICITY</div></div></div><div style="text-align:right"><div class="doc-title">INVOICE</div><div class="doc-code">${code}</div></div></div>
    <div class="meta"><div><strong>Customer:</strong> ${inv.customer?.name||'—'}</div><div><strong>Status:</strong> ${inv.status||'—'}</div><div><strong>Issue Date:</strong> ${inv.issueDate?new Date(inv.issueDate).toLocaleDateString():'—'}</div><div><strong>Due Date:</strong> ${inv.dueDate?new Date(inv.dueDate).toLocaleDateString():'—'}</div></div>
    <table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals"><p>Subtotal: $ ${(+inv.subtotal).toLocaleString('en-US',{minimumFractionDigits:2})}</p><p>Tax: $ ${(+inv.tax).toLocaleString('en-US',{minimumFractionDigits:2})}</p><p class="grand">Total: $ ${(+inv.total).toLocaleString('en-US',{minimumFractionDigits:2})}</p></div>
    <script>window.print();<\/script></body></html>`);
    w.document.close();
  };

  useEffect(() => {
    load();
    client.get('/customers').then(r => setCustomers(r.data));
    client.get('/bank-accounts').then(r => setBankAccts(r.data));
    client.get('/projects').then(r => setProjects(r.data));
    client.get('/materials').then(r => setMaterials(r.data));
  }, [statusFilter]);

  const setLine = (idx, field, val) => {
    const its = [...form.items];
    its[idx] = { ...its[idx], [field]: val };
    const sub = its.reduce((s,i) => s + +i.quantity * +i.unitPrice, 0);
    setForm(f => {
      const taxAmt = sub * (+f.taxPct / 100);
      return { ...f, items: its, subtotal: sub, tax: taxAmt, total: sub + taxAmt };
    });
  };

  const pickMaterial = (idx, matId) => {
    const mat = materials.find(m => String(m.id) === matId);
    const its = [...form.items];
    its[idx] = {
      ...its[idx],
      materialId:  matId,
      description: mat ? mat.name : its[idx].description,
      unitPrice:   mat ? mat.unitCost : its[idx].unitPrice,
    };
    const sub = its.reduce((s,i) => s + +i.quantity * +i.unitPrice, 0);
    setForm(f => {
      const taxAmt = sub * (+f.taxPct / 100);
      return { ...f, items: its, subtotal: sub, tax: taxAmt, total: sub + taxAmt };
    });
  };

  const openEdit = async inv => {
    const { data } = await client.get(`/invoices/${inv.id}`);
    setForm({
      id:         data.id,
      customerId: data.customerId || '',
      contractId: data.contractId || '',
      projectId:  data.projectId  || '',
      dueDate:    data.dueDate ? data.dueDate.slice(0,10) : '',
      taxPct:     data.subtotal > 0 ? +((+data.tax / +data.subtotal) * 100).toFixed(2) : 0,
      subtotal:   data.subtotal,
      tax:        data.tax,
      total:      data.total,
      notes:      data.notes || '',
      items:      data.items?.length ? data.items.map(i => ({ materialId: i.materialId || '', description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })) : [emptyItem()],
    });
    setModal(true);
  };

  const save = async e => {
    e.preventDefault();
    const payload = {
      customerId: form.customerId ? +form.customerId : null,
      contractId: form.contractId ? +form.contractId : null,
      projectId:  form.projectId  ? +form.projectId  : null,
      dueDate:    form.dueDate || null,
      subtotal:   +form.subtotal,
      tax:        +form.tax,
      total:      +form.total,
      notes:      form.notes || null,
      items: form.items.map(i => ({ materialId: i.materialId ? +i.materialId : null, description: i.description, quantity: +i.quantity, unitPrice: +i.unitPrice, total: +i.quantity * +i.unitPrice })),
    };
    if (form.id) {
      const { data } = await client.put(`/invoices/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/invoices', payload);
      setItems(i => [data, ...i]);
    }
    setModal(false);
  };

  const openView = async id => {
    const { data } = await client.get(`/invoices/${id}`);
    setViewModal(data);
  };

  const openPay = inv => {
    const paid = (inv.payments || []).reduce((s,p) => s + +p.amount, 0);
    const balance = +inv.total - paid;
    setPayModal(inv);
    setPayError('');
    setPayForm({ ...emptyPay, amount: balance.toFixed(2), paidAt: new Date().toISOString().split('T')[0] });
  };

  const savePay = async e => {
    e.preventDefault();
    setPayError('');
    try {
      await client.post('/payments', {
        invoiceId:     payModal.id,
        amount:        +payForm.amount,
        method:        payForm.method,
        bankAccountId: payForm.bankAccountId ? +payForm.bankAccountId : null,
        paidAt:        payForm.paidAt || null,
        notes:         payForm.notes,
      });
      setPayModal(null);
      load();
    } catch (err) {
      setPayError(err.response?.data?.error || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button onClick={()=>{setForm(emptyForm);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Invoice</button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {[['','All'],['UNPAID','Unpaid'],['PARTIAL','Partial'],['PAID','Paid'],['OVERDUE','Overdue'],['CANCELLED','Cancelled']].map(([val,label]) => (
          <button key={val} onClick={()=>setStatus(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter===val?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Code','Customer','Project','Due Date','Total','Paid','Balance','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(inv => {
              const paid    = (inv.payments||[]).reduce((s,p) => s + +p.amount, 0);
              const balance = +inv.total - paid;
              const canPay  = (inv.status==='UNPAID'||inv.status==='PARTIAL'||inv.status==='OVERDUE') && balance > 0;
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{invCode(inv.id, inv.createdAt)}</td>
                  <td className="px-4 py-3 font-medium">{inv.customer?.name||'—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.project?.name||'—'}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.dueDate?new Date(inv.dueDate).toLocaleDateString():'—'}</td>
                  <td className="px-4 py-3 font-medium">{fmt(inv.total)}</td>
                  <td className="px-4 py-3 text-green-600">{paid>0?fmt(paid):<span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    {balance>0
                      ? <span className="font-semibold text-red-600">{fmt(balance)}</span>
                      : <span className="text-green-500 text-xs font-semibold">Settled</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status}/></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>openView(inv.id)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">View</button>
                      <button onClick={()=>openEdit(inv)} className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium">Edit</button>
                      {canPay && <button onClick={()=>openPay(inv)} className="px-3 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium">Pay</button>}
                      {(inv.status==='UNPAID'||inv.status==='PARTIAL'||inv.status==='OVERDUE') && <button onClick={()=>voidInvoice(inv)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Void</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── New Invoice Modal ── */}
      {modal && (
        <Modal title={form.id ? 'Edit Invoice' : 'New Invoice'} onClose={()=>{setModal(false);setForm(emptyForm);}} wide>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Project (optional)</label>
                <select value={form.projectId||''} onChange={e => {
                  const pid = e.target.value;
                  const proj = projects.find(p => String(p.id) === pid);
                  setForm(f => ({
                    ...f,
                    projectId: pid,
                    customerId: proj?.customer?.id ? String(proj.customer.id) : f.customerId,
                  }));
                }} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">No project</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Line Items</label>
                <button type="button" onClick={()=>setForm(f=>({...f,items:[...f.items,emptyItem()]}))} className="text-xs text-orange-600 hover:underline">+ Add Item</button>
              </div>
              <div className="grid gap-1 mb-1 text-xs text-gray-400 font-medium px-1" style={{gridTemplateColumns:'repeat(13,minmax(0,1fr))'}}>
                <span className="col-span-3">Inventory Item</span><span className="col-span-4">Description</span><span className="col-span-2">Qty</span><span className="col-span-2">Unit Price</span><span className="col-span-1 text-right">Total</span><span className="col-span-1"/>
              </div>
              {form.items.map((item,idx)=>(
                <div key={idx} className="grid gap-1 mb-2 items-center" style={{gridTemplateColumns:'repeat(13,minmax(0,1fr))'}}>
                  <select value={item.materialId||''} onChange={e=>pickMaterial(idx,e.target.value)}
                    className="col-span-3 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50">
                    <option value="">— Custom —</option>
                    {materials.map(m=><option key={m.id} value={m.id}>{m.name} ({m.unit}) — {m.quantity} left</option>)}
                  </select>
                  <input placeholder="Description" value={item.description} onChange={e=>setLine(idx,'description',e.target.value)} className="col-span-4 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" min="0.01" step="any" value={item.quantity} onChange={e=>setLine(idx,'quantity',+e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" min="0" step="any" value={item.unitPrice} onChange={e=>setLine(idx,'unitPrice',+e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <div className="col-span-1 text-right text-xs font-medium text-gray-700">{fmt(+item.quantity * +item.unitPrice)}</div>
                  <button type="button" onClick={()=>setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}))} className="col-span-1 text-red-400 text-lg text-center">×</button>
                </div>
              ))}
              <div className="grid grid-cols-4 gap-4 mt-3">
                <div><label className="block text-xs text-gray-500 mb-1">Subtotal</label><input readOnly value={fmt(form.subtotal)} className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tax (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={form.taxPct} onChange={e => {
                    const pct = +e.target.value;
                    const taxAmt = +form.subtotal * (pct / 100);
                    setForm(f => ({ ...f, taxPct: pct, tax: taxAmt, total: +f.subtotal + taxAmt }));
                  }} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Tax ($)</label><input readOnly value={fmt(form.tax)} className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
                <div><label className="block text-xs text-gray-500 mb-1">Total</label><input readOnly value={fmt(form.total)} className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 font-bold"/></div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">{form.id ? 'Update Invoice' : 'Create Invoice'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Invoice Modal ── */}
      {viewModal && (
        <Modal title={`Invoice INV-${String(viewModal.id).padStart(4,'0')}`} onClose={()=>setViewModal(null)} wide>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Customer: </span><strong>{viewModal.customer?.name}</strong></div>
              <div className="flex items-center gap-2"><span className="text-gray-500">Status: </span><StatusBadge status={viewModal.status}/></div>
              <div><span className="text-gray-500">Date: </span>{viewModal.date?new Date(viewModal.date).toLocaleDateString():'—'}</div>
              <div><span className="text-gray-500">Due: </span>{viewModal.dueDate?new Date(viewModal.dueDate).toLocaleDateString():'—'}</div>
            </div>
            <table className="w-full text-sm border-t">
              <thead><tr className="text-gray-500 text-xs uppercase">
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr></thead>
              <tbody>
                {viewModal.items?.map((item,i)=>(
                  <tr key={i} className="border-t">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{fmt(item.unitPrice)}</td>
                    <td className="py-2 text-right">{fmt(item.total||item.quantity*item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr><td colSpan={3} className="py-2 text-right text-gray-500">Subtotal</td><td className="py-2 text-right font-medium">{fmt(viewModal.subtotal)}</td></tr>
                <tr><td colSpan={3} className="py-2 text-right text-gray-500">Tax</td><td className="py-2 text-right">{fmt(viewModal.tax)}</td></tr>
                <tr><td colSpan={3} className="py-2 text-right font-bold text-base">Total</td><td className="py-2 text-right font-bold text-base">{fmt(viewModal.total)}</td></tr>
                {viewModal.payments?.length > 0 && (() => {
                  const totalPaid = viewModal.payments.reduce((s,p) => s + +p.amount, 0);
                  const balance = +viewModal.total - totalPaid;
                  return (
                    <>
                      <tr className="text-green-600"><td colSpan={3} className="py-2 text-right">Paid</td><td className="py-2 text-right">{fmt(totalPaid)}</td></tr>
                      <tr className={balance>0?'text-red-600':'text-green-600'}>
                        <td colSpan={3} className="py-2 text-right font-bold">Balance Due</td>
                        <td className="py-2 text-right font-bold">{balance>0?fmt(balance):'Settled'}</td>
                      </tr>
                    </>
                  );
                })()}
              </tfoot>
            </table>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>printInvoice(viewModal)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">🖨 Print</button>
              {(viewModal.status==='UNPAID'||viewModal.status==='PARTIAL'||viewModal.status==='OVERDUE') && <button onClick={()=>voidInvoice(viewModal)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Void</button>}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Record Payment Modal ── */}
      {payModal && (
        <Modal title={`Record Payment — INV-${String(payModal.id).padStart(4,'0')}`} onClose={()=>setPayModal(null)}>
          <form onSubmit={savePay} className="space-y-4">
            {payError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>}
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Customer</span><strong>{payModal.customer?.name}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Invoice Total</span><span>{fmt(payModal.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Balance Due</span><span className="font-bold text-red-600">{fmt(payForm.amount)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($) *</label>
                <input required type="number" step="0.01" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Method *</label>
                <select value={payForm.method} onChange={e=>setPayForm(f=>({...f,method:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
                <select value={payForm.bankAccountId} onChange={e=>setPayForm(f=>({...f,bankAccountId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">No bank account</option>
                  {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                <input type="date" value={payForm.paidAt} onChange={e=>setPayForm(f=>({...f,paidAt:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} value={payForm.notes} onChange={e=>setPayForm(f=>({...f,notes:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setPayModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Record Payment</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
