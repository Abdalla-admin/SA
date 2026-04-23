import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = { customerId:'', contractId:'', dueDate:'', subtotal:0, tax:0, total:0, notes:'', items:[{description:'',quantity:1,unitPrice:0}] };
const emptyPay  = { amount:'', method:'bank_transfer', bankAccountId:'', paidAt:'', notes:'' };
const fmt = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });

export default function Invoices() {
  const [items, setItems]           = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [bankAccounts, setBankAccts]= useState([]);
  const [statusFilter, setStatus]   = useState('');
  const [modal, setModal]           = useState(false);
  const [viewModal, setViewModal]   = useState(null);
  const [payModal, setPayModal]     = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [payForm, setPayForm]       = useState(emptyPay);

  const load = () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    client.get(`/invoices${params}`).then(r => setItems(r.data));
  };

  useEffect(() => {
    load();
    client.get('/customers').then(r => setCustomers(r.data));
    client.get('/bank-accounts').then(r => setBankAccts(r.data));
  }, [statusFilter]);

  const setLine = (idx, field, val) => {
    const its = [...form.items];
    its[idx] = { ...its[idx], [field]: val };
    const sub = its.reduce((s,i) => s + +i.quantity * +i.unitPrice, 0);
    setForm(f => ({ ...f, items: its, subtotal: sub, total: sub + +f.tax }));
  };

  const openEdit = async inv => {
    const { data } = await client.get(`/invoices/${inv.id}`);
    setForm({
      id:         data.id,
      customerId: data.customerId || '',
      contractId: data.contractId || '',
      dueDate:    data.dueDate ? data.dueDate.slice(0,10) : '',
      subtotal:   data.subtotal,
      tax:        data.tax,
      total:      data.total,
      notes:      data.notes || '',
      items:      data.items?.length ? data.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })) : [{ description:'', quantity:1, unitPrice:0 }],
    });
    setModal(true);
  };

  const save = async e => {
    e.preventDefault();
    const payload = {
      customerId: form.customerId ? +form.customerId : null,
      contractId: form.contractId ? +form.contractId : null,
      dueDate:    form.dueDate || null,
      subtotal:   +form.subtotal,
      tax:        +form.tax,
      total:      +form.total,
      notes:      form.notes || null,
      items: form.items.map(i => ({ description: i.description, quantity: +i.quantity, unitPrice: +i.unitPrice, total: +i.quantity * +i.unitPrice })),
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
    setPayForm({ ...emptyPay, amount: balance.toFixed(2), paidAt: new Date().toISOString().split('T')[0] });
  };

  const savePay = async e => {
    e.preventDefault();
    await client.post('/payments', {
      invoiceId:     payModal.id,
      customerId:    payModal.customerId,
      amount:        +payForm.amount,
      method:        payForm.method,
      bankAccountId: payForm.bankAccountId || null,
      paidAt:        payForm.paidAt,
      notes:         payForm.notes,
    });
    setPayModal(null);
    load();
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
            <tr>{['#','Customer','Due Date','Total','Paid','Balance','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(inv => {
              const paid    = (inv.payments||[]).reduce((s,p) => s + +p.amount, 0);
              const balance = +inv.total - paid;
              const canPay  = (inv.status==='UNPAID'||inv.status==='PARTIAL'||inv.status==='OVERDUE') && balance > 0;
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-500">INV-{String(inv.id).padStart(4,'0')}</td>
                  <td className="px-4 py-3 font-medium">{inv.customer?.name||'—'}</td>
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
                    <div className="flex gap-2">
                      <button onClick={()=>openView(inv.id)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">View</button>
                      <button onClick={()=>openEdit(inv)} className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium">Edit</button>
                      {canPay && <button onClick={()=>openPay(inv)} className="px-3 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium">Pay</button>}
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Line Items</label>
                <button type="button" onClick={()=>setForm(f=>({...f,items:[...f.items,{description:'',quantity:1,unitPrice:0}]}))} className="text-xs text-orange-600 hover:underline">+ Add</button>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-400 font-medium px-1">
                <span className="col-span-5">Description</span><span className="col-span-2">Qty</span><span className="col-span-2">Unit Price</span><span className="col-span-2 text-right">Total</span><span className="col-span-1"/>
              </div>
              {form.items.map((item,idx)=>(
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <input placeholder="Description" value={item.description} onChange={e=>setLine(idx,'description',e.target.value)} className="col-span-5 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e=>setLine(idx,'quantity',+e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Unit Price" value={item.unitPrice} onChange={e=>setLine(idx,'unitPrice',+e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <div className="col-span-2 text-right text-sm font-medium text-gray-700">{fmt(+item.quantity * +item.unitPrice)}</div>
                  <button type="button" onClick={()=>setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}))} className="col-span-1 text-red-400 text-lg text-center">×</button>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div><label className="block text-xs text-gray-500 mb-1">Subtotal</label><input readOnly value={fmt(form.subtotal)} className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"/></div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tax ($)</label>
                  <input type="number" value={form.tax} onChange={e=>setForm(f=>({...f,tax:+e.target.value,total:f.subtotal+ +e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                </div>
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
          </div>
        </Modal>
      )}

      {/* ── Record Payment Modal ── */}
      {payModal && (
        <Modal title={`Record Payment — INV-${String(payModal.id).padStart(4,'0')}`} onClose={()=>setPayModal(null)}>
          <form onSubmit={savePay} className="space-y-4">
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
