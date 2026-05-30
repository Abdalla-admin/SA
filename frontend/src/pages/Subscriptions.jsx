import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const empty = { customerId:'', name:'Solar Maintenance Plan', amount:'', billingDay:1, startDate:'', notes:'' };

const fmt = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });

// Compute next due date from billingDay + lastPaidAt (or startDate)
const nextDueDate = (sub) => {
  const day = sub.billingDay;
  const base = sub.lastPaidAt ? new Date(sub.lastPaidAt) : new Date(sub.startDate);
  const d = new Date(base.getFullYear(), base.getMonth() + 1, day);
  return d;
};

const getStatus = (sub) => {
  if (sub.status !== 'ACTIVE') return 'inactive';
  const due = nextDueDate(sub);
  const today = new Date();
  const diffDays = Math.ceil((due - today) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'due-soon';
  return 'ok';
};

const statusConfig = {
  overdue:  { label: 'Overdue',  bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  'due-soon': { label: 'Due Soon', bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  ok:       { label: 'Paid Up',  bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
};

const StatusPill = ({ sub }) => {
  const st = getStatus(sub);
  const c = statusConfig[st];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
  </div>
);

const remind = (sub) => {
  const phone = sub.customer?.phone?.replace(/\D/g, '');
  const due = nextDueDate(sub);
  const dateStr = due.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const msg = `Dear ${sub.customer?.name},\n\nThis is a friendly reminder that your *${sub.name}* payment of *${fmt(sub.amount)}* is due on *${dateStr}*.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\nSun Aratinga Solar`;
  if (phone) {
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  } else {
    navigator.clipboard?.writeText(msg);
    alert('No phone number on file — message copied to clipboard.');
  }
};

export default function Subscriptions() {
  const { confirm } = useDialog();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [viewed, setViewed] = useState(null);
  const [payForm, setPayForm] = useState({ amount:'', paidAt:'', notes:'' });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    client.get('/subscriptions').then(r => setItems(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    if (form.id) {
      const { data } = await client.put(`/subscriptions/${form.id}`, form);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/subscriptions', form);
      setItems(i => [data, ...i]);
    }
    setModal(null);
  };

  const del = async id => {
    if (!await confirm('Delete this subscription? Payment history will also be removed.')) return;
    await client.delete(`/subscriptions/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
  };

  const openPay = sub => {
    setViewed(sub);
    setPayForm({ amount: String(sub.amount), paidAt: new Date().toISOString().split('T')[0], notes: '' });
    setModal('pay');
  };

  const savePay = async e => {
    e.preventDefault();
    const { data } = await client.post(`/subscriptions/${viewed.id}/pay`, payForm);
    setItems(i => i.map(x => x.id === data.id ? data : x));
    setViewed(data);
    setModal('view');
  };

  const filtered = items.filter(s => {
    if (filter === 'all') return true;
    return getStatus(s) === filter;
  });

  const counts = {
    overdue:  items.filter(s => getStatus(s) === 'overdue').length,
    'due-soon': items.filter(s => getStatus(s) === 'due-soon').length,
    ok:       items.filter(s => getStatus(s) === 'ok').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <button onClick={()=>{setForm(empty);setModal('form');}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Subscription</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Overdue', key: 'overdue', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', num: 'text-red-600' },
          { label: 'Due This Week', key: 'due-soon', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', num: 'text-amber-600' },
          { label: 'Paid Up', key: 'ok', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', num: 'text-green-600' },
        ].map(c => (
          <button key={c.key} onClick={()=>setFilter(filter===c.key?'all':c.key)}
            className={`rounded-xl border p-4 text-left transition-all ${c.bg} ${c.border} ${filter===c.key?'ring-2 ring-orange-400':''}`}>
            <p className={`text-xs font-medium ${c.text}`}>{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.num}`}>{counts[c.key]}</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[['all','All'],['overdue','Overdue'],['due-soon','Due Soon'],['ok','Paid Up'],['inactive','Inactive']].map(([val,label])=>(
          <button key={val} onClick={()=>setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter===val?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Customer','Plan','Amount','Billing Day','Last Paid','Next Due','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No subscriptions{filter!=='all'?` with status "${filter}"`:''}.</td></tr>
            )}
            {filtered.map(sub => {
              const due = nextDueDate(sub);
              const st = getStatus(sub);
              return (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{sub.customer?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{sub.name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{fmt(sub.amount)}</td>
                  <td className="px-4 py-3 text-gray-500">Day {sub.billingDay}</td>
                  <td className="px-4 py-3 text-gray-500">{sub.lastPaidAt ? new Date(sub.lastPaidAt).toLocaleDateString() : '—'}</td>
                  <td className={`px-4 py-3 font-medium ${st==='overdue'?'text-red-600':st==='due-soon'?'text-amber-600':'text-gray-700'}`}>
                    {sub.status==='ACTIVE' ? due.toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusPill sub={sub} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>{setViewed(sub);setModal('view');}} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                      {sub.status==='ACTIVE' && (
                        <>
                          <button onClick={()=>openPay(sub)} className="px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium">Mark Paid</button>
                          <button onClick={()=>remind(sub)} className="px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium">💬 Remind</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (() => {
        const due = nextDueDate(viewed);
        const st = getStatus(viewed);
        return (
          <Modal title={`${viewed.customer?.name} — ${viewed.name}`} onClose={()=>setModal(null)} wide>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Customer" value={viewed.customer?.name} />
                <Field label="Phone" value={viewed.customer?.phone} />
                <Field label="Plan" value={viewed.name} />
                <div>
                  <p className="text-xs text-gray-400">Amount</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(viewed.amount)}</p>
                </div>
                <Field label="Billing Day" value={`Day ${viewed.billingDay} of each month`} />
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <div className="mt-0.5"><StatusPill sub={viewed} /></div>
                </div>
                <Field label="Last Paid" value={viewed.lastPaidAt ? new Date(viewed.lastPaidAt).toLocaleDateString() : 'Never'} />
                <div>
                  <p className="text-xs text-gray-400">Next Due</p>
                  <p className={`text-sm font-medium mt-0.5 ${st==='overdue'?'text-red-600':st==='due-soon'?'text-amber-600':''}`}>
                    {viewed.status==='ACTIVE' ? due.toLocaleDateString() : '—'}
                  </p>
                </div>
                {viewed.notes && <div className="col-span-2"><Field label="Notes" value={viewed.notes} /></div>}
              </div>

              {/* Payment history */}
              {viewed.payments?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment History</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {viewed.payments.map(p => (
                      <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{new Date(p.paidAt).toLocaleDateString()}</span>
                        <span className="font-medium text-green-700">{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t flex-wrap">
                {viewed.status==='ACTIVE' && (
                  <>
                    <button onClick={()=>remind(viewed)} className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium">💬 WhatsApp Remind</button>
                    <button onClick={()=>openPay(viewed)} className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm font-medium">Mark Paid</button>
                  </>
                )}
                <button onClick={()=>{setForm({...viewed,customerId:String(viewed.customerId),startDate:viewed.startDate?.slice(0,10)||''});setModal('form');}} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>
                <button onClick={()=>del(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Mark Paid Modal */}
      {modal === 'pay' && viewed && (
        <Modal title={`Record Payment — ${viewed.customer?.name}`} onClose={()=>setModal('view')}>
          <form onSubmit={savePay} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-amber-800">{viewed.name}</p>
              <p className="text-amber-700 mt-0.5">Monthly amount: <strong>{fmt(viewed.amount)}</strong></p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid ($)</label>
              <input required type="number" step="0.01" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
              <input type="date" value={payForm.paidAt} onChange={e=>setPayForm(f=>({...f,paidAt:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={payForm.notes} onChange={e=>setPayForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Bank transfer ref #..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setModal('view')} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Confirm Payment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* New / Edit Modal */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Edit Subscription' : 'New Subscription'} onClose={()=>setModal(null)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
              <select required value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select customer</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Plan Name *</label>
              <input required type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Amount ($) *</label>
                <input required type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Billing Day (1–28) *</label>
                <input required type="number" min={1} max={28} value={form.billingDay} onChange={e=>setForm(f=>({...f,billingDay:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input required type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status||'ACTIVE'} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
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
