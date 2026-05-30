import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyLine = () => ({ materialId: '', quantity: '1', unitPrice: '' });
const fmt = n => '$ ' + (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | 'view'
  const [viewed, setViewed] = useState(null);

  // New sale form
  const [saleCustomer, setSaleCustomer] = useState('');
  const [saleLines, setSaleLines] = useState([emptyLine()]);
  const [saleDue, setSaleDue] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleError, setSaleError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    client.get('/invoices?status=PAID').then(r => setSales(r.data));
    client.get('/invoices').then(r => setAllInvoices(r.data));  // all types for summary stats
    client.get('/materials').then(r => setMaterials(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
  }, []);

  const openNew = () => {
    setSaleCustomer('');
    setSaleLines([emptyLine()]);
    setSaleDue('');
    setSaleNotes('');
    setSaleError('');
    setModal('new');
  };

  const updateLine = (idx, field, value) => {
    setSaleLines(lines => {
      const next = [...lines];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'materialId' && value) {
        const mat = materials.find(m => m.id === +value);
        if (mat) next[idx].unitPrice = String(mat.unitCost);
      }
      return next;
    });
  };

  const addLine = () => setSaleLines(l => [...l, emptyLine()]);
  const removeLine = idx => setSaleLines(l => l.filter((_, i) => i !== idx));

  const saleTotal = saleLines.reduce((sum, l) => sum + (+l.quantity || 0) * (+l.unitPrice || 0), 0);
  const usedIds = saleLines.map(l => +l.materialId).filter(Boolean);

  const submitSale = async e => {
    e.preventDefault();
    setSaleError('');
    const validLines = saleLines.filter(l => l.materialId && +l.quantity > 0 && +l.unitPrice >= 0);
    if (!validLines.length) { setSaleError('Add at least one item'); return; }
    try {
      const { data } = await client.post('/materials/sell', {
        customerId: saleCustomer,
        items: validLines.map(l => ({ materialId: l.materialId, quantity: l.quantity, unitPrice: l.unitPrice })),
        dueDate: saleDue,
        notes: saleNotes,
      });
      setSales(s => [data.invoice, ...s]);
      setModal(null);
      setSuccessMsg(`Sale #${data.invoice.id} created — ${fmt(data.invoice.total)}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setSaleError(err.response?.data?.error || 'Failed to process sale');
    }
  };

  const totalRevenue = allInvoices.reduce((sum, s) => sum + (s.payments || []).reduce((ps, p) => ps + p.amount, 0), 0);
  const outstanding = allInvoices.reduce((sum, s) => {
    const paid = (s.payments || []).reduce((ps, p) => ps + p.amount, 0);
    return sum + Math.max(0, s.total - paid);
  }, 0);

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-green-500 text-white px-5 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-white/70 hover:text-white ml-4">×</button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <button onClick={openNew} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Sale</button>
      </div>

      {/* Summary by status */}
      {(() => {
        const statuses = [
          { key: 'PAID',      label: 'Paid',      color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
          { key: 'UNPAID',    label: 'Unpaid',    color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { key: 'PARTIAL',   label: 'Partial',   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
          { key: 'OVERDUE',   label: 'Overdue',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
          { key: 'CANCELLED', label: 'Cancelled', color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-100' },
        ];
        return (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {statuses.map(s => {
              const group = allInvoices.filter(i => i.status === s.key);
              const total = group.reduce((sum, i) => sum + i.total, 0);
              return (
                <div key={s.key} className={`rounded-xl p-4 border ${s.bg} ${s.border}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${s.color}`}>{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{group.length}</p>
                  <p className={`text-sm font-medium mt-0.5 ${s.color}`}>{fmt(total)}</p>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['#','Date','Customer','Items','Total','Due Date','Status',''].map(h =>
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sales.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No sales yet. Click + New Sale to get started.</td></tr>
            )}
            {sales.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setViewed(s); setModal('view'); }}>
                <td className="px-4 py-3 font-mono text-gray-500">#{s.id}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(s.issueDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium">{s.customer?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.items?.length} item{s.items?.length !== 1 ? 's' : ''}</td>
                <td className="px-4 py-3 font-semibold">{fmt(s.total)}</td>
                <td className="px-4 py-3 text-gray-500">{s.dueDate ? new Date(s.dueDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3">
                  <button className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title={`Sale #${viewed.id} — ${viewed.customer?.name}`} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-gray-400">Customer</p><p className="font-medium mt-0.5">{viewed.customer?.name}</p></div>
              <div><p className="text-xs text-gray-400">Date</p><p className="font-medium mt-0.5">{new Date(viewed.issueDate).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-gray-400">Status</p><div className="mt-0.5"><StatusBadge status={viewed.status} /></div></div>
              {viewed.dueDate && <div><p className="text-xs text-gray-400">Due Date</p><p className="font-medium mt-0.5">{new Date(viewed.dueDate).toLocaleDateString()}</p></div>}
              {viewed.notes && <div className="col-span-2"><p className="text-xs text-gray-400">Notes</p><p className="font-medium mt-0.5">{viewed.notes}</p></div>}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewed.items?.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">{item.description}</td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{fmt(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-700">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">{fmt(viewed.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {viewed.payments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Payments</p>
                <div className="space-y-1">
                  {viewed.payments.map(p => (
                    <div key={p.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                      <span className="text-gray-500">{new Date(p.paidAt || p.createdAt).toLocaleDateString()}</span>
                      <span className="font-medium text-green-700">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* New Sale Modal */}
      {modal === 'new' && (
        <Modal title="New Sale" onClose={() => setModal(null)} wide>
          <form onSubmit={submitSale} className="space-y-4">
            {saleError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saleError}</p>}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
              <select required value={saleCustomer} onChange={e => setSaleCustomer(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Items</label>
              <div className="space-y-2">
                {saleLines.map((line, idx) => {
                  const mat = materials.find(m => m.id === +line.materialId);
                  const lineTotal = (+line.quantity || 0) * (+line.unitPrice || 0);
                  return (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <select required value={line.materialId} onChange={e => updateLine(idx, 'materialId', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option value="">Select item</option>
                          {materials.filter(m => !usedIds.includes(m.id) || m.id === +line.materialId).map(m => (
                            <option key={m.id} value={m.id}>{m.name}{m.brand ? ` · ${m.brand}` : ''} — {m.quantity} {m.unit} avail.</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input required type="number" min="0.01" step="0.01" max={mat?.quantity || undefined} placeholder="Qty" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                      <div className="w-28">
                        <input required type="number" min="0" step="0.01" placeholder="Unit $" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                      <div className="w-24 py-2 text-sm font-medium text-gray-700 text-right">
                        {lineTotal > 0 ? fmt(lineTotal) : '—'}
                      </div>
                      {saleLines.length > 1 && (
                        <button type="button" onClick={() => removeLine(idx)} className="py-2 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addLine} className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium">+ Add another item</button>
            </div>

            {saleTotal > 0 && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-gray-500">Invoice Total</span>
                <span className="text-lg font-bold text-gray-900">{fmt(saleTotal)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input type="date" value={saleDue} onChange={e => setSaleDue(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={saleNotes} onChange={e => setSaleNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1 border-t">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Confirm Sale &amp; Create Invoice</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
