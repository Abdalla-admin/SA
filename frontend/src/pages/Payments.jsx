import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';

export default function Payments() {
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ invoiceId:'', bankAccountId:'', amount:0, method:'', reference:'', paidAt:'', notes:'' });

  useEffect(() => {
    client.get('/payments').then(r => setItems(r.data));
    client.get('/invoices').then(r => setInvoices(r.data.filter(i=>i.status!=='PAID')));
    client.get('/bank-accounts').then(r => setBankAccounts(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const { data } = await client.post('/payments', { ...form, invoiceId: +form.invoiceId, bankAccountId: form.bankAccountId ? +form.bankAccountId : null, amount: +form.amount });
    setItems(i => [data, ...i]);
    setModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <button onClick={() => setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Record Payment</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Invoice','Customer','Amount','Method','Bank Account','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(p=>(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">INV-{String(p.invoiceId).padStart(4,'0')}</td>
                <td className="px-4 py-3">{p.invoice?.customer?.name||'—'}</td>
                <td className="px-4 py-3 font-medium text-green-600">$ {p.amount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{p.method||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{p.bankAccount?.name||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.paidAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Record Payment" onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice</label>
              <select required value={form.invoiceId} onChange={e=>setForm(f=>({...f,invoiceId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select invoice</option>
                {invoices.map(i=><option key={i.id} value={i.id}>INV-{String(i.id).padStart(4,'0')} — {i.customer?.name} — $ {i.total}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
              <select value={form.bankAccountId} onChange={e=>setForm(f=>({...f,bankAccountId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select account</option>
                {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {[['Amount ($)','amount','number',true],['Method','method','text'],['Reference','reference','text'],['Date','paidAt','date']].map(([l,k,t,req])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={!!req} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
