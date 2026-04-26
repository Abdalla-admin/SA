import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const empty = { name:'', bankName:'', accountNumber:'', balance:0, currency:'USD' };
const fmt = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });

export default function BankAccounts() {
  const { confirm } = useDialog();
  const [items, setItems]     = useState([]);
  const [modal, setModal]     = useState(false);
  const [txModal, setTxModal] = useState(null);
  const [form, setForm]       = useState(empty);
  const [delError, setDelError] = useState('');

  useEffect(() => { client.get('/bank-accounts').then(r => setItems(r.data)); }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, balance: +form.balance };
    if (form.id) {
      const { data } = await client.put(`/bank-accounts/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/bank-accounts', payload);
      setItems(i => [data, ...i]);
    }
    setModal(false);
  };

  const del = async id => {
    setDelError('');
    if (!await confirm('Delete this bank account? This cannot be undone.')) return;
    try {
      await client.delete(`/bank-accounts/${id}`);
      setItems(i => i.filter(x => x.id !== id));
    } catch (err) {
      setDelError(err.response?.data?.error || 'Failed to delete account');
    }
  };

  const openTx = async (a) => {
    const { data } = await client.get(`/bank-accounts/${a.id}`);
    setTxModal(data);
  };

  const total = items.reduce((s,a) => s + a.balance, 0);

  const buildLedger = (acc) => {
    const rows = [];
    (acc.payments || []).forEach(p => rows.push({
      date: p.paidAt,
      type: 'credit',
      label: `Payment — INV-${String(p.invoice?.id||0).padStart(4,'0')} (${p.invoice?.customer?.name||'—'})`,
      amount: p.amount,
      ref: p.reference || p.method || '',
    }));
    (acc.expenses || []).forEach(e => rows.push({
      date: e.expenseDate,
      type: 'debit',
      label: `Expense — ${e.description || e.category || '—'}`,
      amount: e.amount,
      ref: e.category || '',
    }));
    (acc.transfersFrom || []).forEach(t => rows.push({
      date: t.transferDate,
      type: 'debit',
      label: `Transfer Out → ${t.toAccount?.name || '—'}`,
      amount: t.amount,
      ref: t.reference || '',
    }));
    (acc.transfersTo || []).forEach(t => rows.push({
      date: t.transferDate,
      type: 'credit',
      label: `Transfer In ← ${t.fromAccount?.name || '—'}`,
      amount: t.amount,
      ref: t.reference || '',
    }));
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-sm text-gray-500">Total Balance: {fmt(total)}</p>
        </div>
        <button onClick={()=>{setForm(empty);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Account</button>
      </div>

      {delError && <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">{delError}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{a.name}</h3>
                <p className="text-xs text-gray-400">{a.bankName} {a.accountNumber&&`· ${a.accountNumber}`}</p>
              </div>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{a.currency}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{a.currency} {(+a.balance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={()=>{setForm(a);setModal(true);}} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
              <button onClick={()=>openTx(a)} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">Transactions</button>
              <button onClick={()=>del(a.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / New Modal */}
      {modal && (
        <Modal title={form.id?'Edit Account':'New Account'} onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {[['Account Name','name','text',true],['Bank Name','bankName','text'],['Account Number','accountNumber','text'],['Opening Balance','balance','number'],['Currency','currency','text']].map(([l,k,t,req])=>(
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

      {/* Transactions Modal */}
      {txModal && (() => {
        const ledger = buildLedger(txModal);
        const totalIn  = ledger.filter(r=>r.type==='credit').reduce((s,r)=>s+r.amount,0);
        const totalOut = ledger.filter(r=>r.type==='debit').reduce((s,r)=>s+r.amount,0);
        return (
          <Modal title={`Transactions — ${txModal.name}`} onClose={()=>setTxModal(null)} wide>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Current Balance</div>
                  <div className="font-bold text-lg text-gray-900 mt-0.5">{fmt(txModal.balance)}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-600">Total In</div>
                  <div className="font-bold text-lg text-green-700 mt-0.5">+{fmt(totalIn)}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs text-red-600">Total Out</div>
                  <div className="font-bold text-lg text-red-700 mt-0.5">-{fmt(totalOut)}</div>
                </div>
              </div>
              {ledger.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        {['Date','Description','Ref','Amount'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ledger.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-gray-800">{row.label}</td>
                          <td className="px-3 py-2 text-gray-400 text-xs">{row.ref}</td>
                          <td className={`px-3 py-2 font-semibold whitespace-nowrap ${row.type==='credit'?'text-green-600':'text-red-600'}`}>
                            {row.type==='credit'?'+':'-'}{fmt(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
