import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';
import { payCode, invCode } from '../utils/docCode';

const emptyForm = { invoiceId: '', customerId: '', amount: '', method: 'bank_transfer', bankAccountId: '', paidAt: new Date().toISOString().split('T')[0], notes: '' };
const methodColors = { bank_transfer: 'text-blue-600', cash: 'text-green-600', mobile_money: 'text-yellow-600', cheque: 'text-purple-600', card: 'text-orange-600' };
const fmt = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });

const printPayment = (p) => {
  const code = payCode(p.id, p.createdAt || p.paidAt);
  const invRef = invCode(p.invoiceId, p.invoice?.createdAt || p.paidAt);
  const logo = window.location.origin + '/logo.png';
  const w = window.open('','_blank','width=800,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>${code}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;color:#333}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ea580c;padding-bottom:12px;margin-bottom:20px}.co-wrap{display:flex;align-items:center;gap:10px}.company-name{font-size:20px;font-weight:bold;color:#1e3a5f}.company-tag{font-size:11px;color:#ea580c;font-weight:600}.doc-code{font-size:11px;color:#6b7280;margin-top:4px}.doc-title{font-size:22px;font-weight:bold;color:#ea580c}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px}.amount{font-size:20px;font-weight:bold;color:#16a34a;margin:16px 0}@page{margin:20mm}</style>
  </head><body>
  <div class="header"><div class="co-wrap"><img src="${logo}" style="height:55px;object-fit:contain" onerror="this.style.display='none'"><div><div class="company-name">SUN ARATINGA</div><div class="company-tag">SUNLIGHT INTO ELECTRICITY</div></div></div><div style="text-align:right"><div class="doc-title">PAYMENT RECEIPT</div><div class="doc-code">${code}</div></div></div>
  <div class="row"><span>Invoice Ref</span><strong>${invRef}</strong></div>
  <div class="row"><span>Customer</span><strong>${p.invoice?.customer?.name||'—'}</strong></div>
  <div class="row"><span>Method</span><span style="text-transform:capitalize">${(p.method||'').replace(/_/g,' ')}</span></div>
  <div class="row"><span>Bank Account</span><span>${p.bankAccount?.name||'Cash'}</span></div>
  <div class="row"><span>Date</span><span>${new Date(p.paidAt).toLocaleDateString()}</span></div>
  ${p.notes?`<div class="row"><span>Notes</span><span>${p.notes}</span></div>`:''}
  <div class="amount">Amount Paid: $ ${(+p.amount).toLocaleString('en-US',{minimumFractionDigits:2})}</div>
  <script>window.print();<\/script></body></html>`);
  w.document.close();
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
  </div>
);

export default function Payments() {
  const { confirm } = useDialog();
  const [items, setItems]         = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [viewed, setViewed]       = useState(null);
  const [error, setError]         = useState('');

  const load = () => client.get('/payments').then(r => setItems(r.data));

  useEffect(() => {
    load();
    client.get('/invoices').then(r => setInvoices(r.data.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')));
    client.get('/customers').then(r => setCustomers(r.data));
    client.get('/bank-accounts').then(r => setBankAccounts(r.data));
  }, []);

  const onInvoiceChange = e => {
    const inv = invoices.find(i => i.id === +e.target.value);
    const balance = inv ? inv.total - (inv.payments || []).reduce((s, p) => s + p.amount, 0) : '';
    setForm(f => ({
      ...f,
      invoiceId:  e.target.value,
      customerId: inv?.customerId ? String(inv.customerId) : f.customerId,
      amount:     balance ? Number(balance).toFixed(2) : f.amount,
    }));
  };

  const save = async () => {
    setError('');
    try {
      if (form.id) {
        const { data } = await client.put(`/payments/${form.id}`, {
          amount: +form.amount,
          method: form.method,
          bankAccountId: form.bankAccountId ? +form.bankAccountId : null,
          paidAt: form.paidAt,
          notes: form.notes || null,
        });
        setItems(i => i.map(x => x.id === data.id ? data : x));
      } else {
        await client.post('/payments', {
          invoiceId:     +form.invoiceId,
          customerId:    form.customerId ? +form.customerId : null,
          amount:        +form.amount,
          method:        form.method,
          bankAccountId: form.bankAccountId ? +form.bankAccountId : null,
          paidAt:        form.paidAt,
          notes:         form.notes || null,
        });
        load();
      }
      setModal(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const voidPayment = async id => {
    if (!await confirm('Void this payment? The bank balance will be reversed and invoice status updated.')) return;
    await client.delete(`/payments/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <button onClick={() => { setForm(emptyForm); setError(''); setModal('new'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Record Payment</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Invoice','Customer','Amount','Method','Bank Account','Date','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No payments recorded yet</td></tr>
            )}
            {items.map(p=>(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">INV-{String(p.invoiceId).padStart(4,'0')}</td>
                <td className="px-4 py-3 font-medium">{p.invoice?.customer?.name || '—'}</td>
                <td className="px-4 py-3 font-semibold text-green-700">{fmt(p.amount)}</td>
                <td className={`px-4 py-3 capitalize font-medium ${methodColors[p.method]||'text-gray-600'}`}>{(p.method||'').replace('_',' ')}</td>
                <td className="px-4 py-3 text-gray-500">{p.bankAccount?.name || 'Cash'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.paidAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>{setViewed(p);setModal('view');}} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    <button onClick={()=>{setForm({...p,invoiceId:String(p.invoiceId),bankAccountId:p.bankAccountId?String(p.bankAccountId):'',paidAt:p.paidAt?p.paidAt.slice(0,10):''});setError('');setModal('edit');}} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={()=>voidPayment(p.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Void</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title="Payment Details" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Invoice" value={`INV-${String(viewed.invoiceId).padStart(4,'0')}`} />
              <Field label="Customer" value={viewed.invoice?.customer?.name} />
              <div>
                <p className="text-xs text-gray-400">Amount</p>
                <p className="text-lg font-bold text-green-700 mt-0.5">{fmt(viewed.amount)}</p>
              </div>
              <Field label="Method" value={(viewed.method||'').replace('_',' ')} />
              <Field label="Bank Account" value={viewed.bankAccount?.name || 'Cash'} />
              <Field label="Date" value={new Date(viewed.paidAt).toLocaleDateString()} />
              {viewed.notes && <div className="col-span-2"><Field label="Notes" value={viewed.notes} /></div>}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>printPayment(viewed)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">🖨 Print</button>
              <button onClick={()=>{setForm({...viewed,invoiceId:String(viewed.invoiceId),bankAccountId:viewed.bankAccountId?String(viewed.bankAccountId):'',paidAt:viewed.paidAt?viewed.paidAt.slice(0,10):''});setError('');setModal('edit');}} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>
              <button onClick={()=>voidPayment(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Void</button>
            </div>
          </div>
        </Modal>
      )}

      {/* New / Edit Modal */}
      {(modal === 'new' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? 'Edit Payment' : 'Record Payment'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

            {modal === 'new' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoice *</label>
                  <select required value={form.invoiceId} onChange={onInvoiceChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select invoice</option>
                    {invoices.map(i => (
                      <option key={i.id} value={i.id}>
                        INV-{String(i.id).padStart(4,'0')} — {i.customer?.name} — $ {(+i.total).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                  <select required value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($) *</label>
                <input required type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Method *</label>
                <select value={form.method} onChange={e=>setForm(f=>({...f,method:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
                <select value={form.bankAccountId} onChange={e=>setForm(f=>({...f,bankAccountId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">No bank account</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                <input type="date" value={form.paidAt} onChange={e=>setForm(f=>({...f,paidAt:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="button" onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">{modal === 'edit' ? 'Update Payment' : 'Record Payment'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
