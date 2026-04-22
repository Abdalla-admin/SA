import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';

const emptyForm = { invoiceId: '', customerId: '', amount: '', method: 'bank_transfer', bankAccountId: '', paidAt: new Date().toISOString().split('T')[0], notes: '' };

const methodColors = { bank_transfer: 'text-blue-600', cash: 'text-green-600', cheque: 'text-purple-600', card: 'text-orange-600' };

export default function Payments() {
  const [items, setItems]         = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(emptyForm);
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
      await client.post('/payments', {
        invoiceId:     +form.invoiceId,
        customerId:    form.customerId ? +form.customerId : null,
        amount:        +form.amount,
        method:        form.method,
        bankAccountId: form.bankAccountId ? +form.bankAccountId : null,
        paidAt:        form.paidAt,
        notes:         form.notes || null,
      });
      setModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <button onClick={() => { setForm(emptyForm); setError(''); setModal(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Record Payment</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Invoice','Customer','Amount','Method','Bank Account','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No payments recorded yet</td></tr>
            )}
            {items.map(p=>(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">INV-{String(p.invoiceId).padStart(4,'0')}</td>
                <td className="px-4 py-3 font-medium">{p.invoice?.customer?.name || '—'}</td>
                <td className="px-4 py-3 font-semibold text-green-700">$ {(+p.amount).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                <td className={`px-4 py-3 capitalize font-medium ${methodColors[p.method]||'text-gray-600'}`}>{(p.method||'').replace('_',' ')}</td>
                <td className="px-4 py-3 text-gray-500">{p.bankAccount?.name || 'Cash'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.paidAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Record Payment" onClose={() => setModal(false)}>
          <div className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

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
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="button" onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Record Payment</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
