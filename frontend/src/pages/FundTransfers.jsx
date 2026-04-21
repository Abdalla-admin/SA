import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';

export default function FundTransfers() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fromAccountId:'', toAccountId:'', amount:0, reference:'', notes:'' });

  useEffect(() => {
    client.get('/fund-transfers').then(r => setItems(r.data));
    client.get('/bank-accounts').then(r => setAccounts(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const { data } = await client.post('/fund-transfers', { ...form, fromAccountId: +form.fromAccountId, toAccountId: +form.toAccountId, amount: +form.amount });
    setItems(i => [data, ...i]);
    setModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Fund Transfers</h1>
        <button onClick={()=>setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Transfer</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['From','To','Amount','Reference','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(t=>(
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{t.fromAccount?.name}</td>
                <td className="px-4 py-3">{t.toAccount?.name}</td>
                <td className="px-4 py-3 font-medium">$ {t.amount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{t.reference||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(t.transferDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="New Fund Transfer" onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {[['From Account','fromAccountId'],['To Account','toAccountId']].map(([l,k])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <select required value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select</option>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.name} ($ {a.balance?.toLocaleString()})</option>)}
                </select>
              </div>
            ))}
            {[['Amount ($)','amount','number'],['Reference','reference','text'],['Notes','notes','text']].map(([l,k,t])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={k==='amount'} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Transfer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
