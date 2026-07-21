import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';
import { invCode } from '../utils/docCode';

const STATUSES = ['PLANNING','DESIGN','PROCUREMENT','EXECUTION','COMMISSIONING','COMPLETED','ON_HOLD'];
const STATUS_PROGRESS = { PLANNING:5, DESIGN:20, PROCUREMENT:40, EXECUTION:65, COMMISSIONING:85, COMPLETED:100, ON_HOLD:null };
const empty = { name:'', customerId:'', systemCapacity:'', status:'PLANNING', budget:'', startDate:'', targetDate:'', progressPct:0, notes:'', warrantyStartDate:'', warrantyEndDate:'', warrantyTerms:'', warrantyMaintenancePeriod:'' };

export default function Projects() {
  const { confirm } = useDialog();
  const [projects, setProjects]     = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState(empty);
  const [selected, setSelected]     = useState(null);
  const [allInvoices, setAllInvoices] = useState([]);
  const [linkInvId, setLinkInvId]   = useState('');

  useEffect(() => {
    client.get('/projects').then(r => setProjects(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const payload = {
      name: form.name,
      customerId: form.customerId ? +form.customerId : null,
      systemCapacity: form.systemCapacity ? +form.systemCapacity : null,
      budget: form.budget ? +form.budget : null,
      startDate: form.startDate || null,
      targetDate: form.targetDate || null,
      status: form.status,
      progressPct: +form.progressPct,
      notes: form.notes || null,
      warrantyStartDate: form.warrantyStartDate || null,
      warrantyEndDate: form.warrantyEndDate || null,
      warrantyTerms: form.warrantyTerms || null,
      warrantyMaintenancePeriod: form.warrantyMaintenancePeriod || null,
    };
    if (form.id) {
      const { data } = await client.put(`/projects/${form.id}`, payload);
      setProjects(p => p.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/projects', payload);
      setProjects(p => [data, ...p]);
    }
    setModal(null);
  };

  const openDetail = async (p) => {
    const [{ data }, { data: invs }] = await Promise.all([
      client.get(`/projects/${p.id}`),
      client.get('/invoices'),
    ]);
    setSelected(data);
    setAllInvoices(invs);
    setLinkInvId('');
    setModal('detail');
  };

  const linkInvoice = async () => {
    if (!linkInvId) return;
    await client.patch(`/invoices/${linkInvId}/project`, { projectId: selected.id });
    const { data } = await client.get(`/projects/${selected.id}`);
    setSelected(data);
    setLinkInvId('');
  };

  const unlinkInvoice = async (invId) => {
    await client.patch(`/invoices/${invId}/project`, { projectId: null });
    const { data } = await client.get(`/projects/${selected.id}`);
    setSelected(data);
  };

  const del = async id => {
    if (!await confirm('Delete this project? All milestones, designs, and warranty records will also be deleted.')) return;
    try {
      await client.delete(`/projects/${id}`);
      setProjects(p => p.filter(x => x.id !== id));
      if (modal === 'detail') setModal(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete project');
    }
  };

  const openEdit = p => {
    const w = p.warranty;
    setForm({
      ...p,
      customerId: p.customerId || '',
      warrantyStartDate: w?.startDate ? w.startDate.slice(0,10) : '',
      warrantyEndDate:   w?.endDate   ? w.endDate.slice(0,10)   : '',
      warrantyTerms:     w?.terms     || '',
      warrantyMaintenancePeriod: w?.maintenancePeriod || '',
    });
    setModal('form');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={() => { setForm(empty); setModal('form'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Project</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{p.customer?.name}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="space-y-1.5 text-sm text-gray-600 flex-1">
              {p.systemCapacity && <div>⚡ {p.systemCapacity} kW</div>}
              {p.budget && <div>💰 $ {p.budget.toLocaleString()}</div>}
              {p.targetDate && <div>📅 Target: {new Date(p.targetDate).toLocaleDateString()}</div>}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span><span>{p.progressPct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${p.progressPct}%` }} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
              <button onClick={() => openDetail(p)} className="flex-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
              <button onClick={() => openEdit(p)} className="flex-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
              <button onClick={() => del(p.id)} className="flex-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Edit Project' : 'New Project'} onClose={() => setModal(null)} wide>
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            {[['Project Name','name','text',true],['Capacity (kW)','systemCapacity','number'],['Budget ($)','budget','number'],['Start Date','startDate','date'],['Target Date','targetDate','date']].map(([l,k,t,req]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={!!req} value={form[k]||''} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
              <select value={form.customerId||''} onChange={e => setForm(f=>({...f,customerId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e => {
                const s = e.target.value;
                const pct = STATUS_PROGRESS[s];
                setForm(f => ({ ...f, status: s, ...(pct !== null ? { progressPct: pct } : {}) }));
              }} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Progress: {form.progressPct}%</label>
              <input type="range" min={0} max={100} value={form.progressPct} onChange={e => setForm(f=>({...f,progressPct:+e.target.value}))} className="w-full accent-orange-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes||''} onChange={e => setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-green-700 mb-2">🛡️ Warranty (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Start Date</label>
                  <input type="date" value={form.warrantyStartDate||''} onChange={e=>setForm(f=>({...f,warrantyStartDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warranty End Date</label>
                  <input type="date" value={form.warrantyEndDate||''} onChange={e=>setForm(f=>({...f,warrantyEndDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Maintenance Period</label>
                  <input type="text" placeholder="e.g. 2 years" value={form.warrantyMaintenancePeriod||''} onChange={e=>setForm(f=>({...f,warrantyMaintenancePeriod:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Notes</label>
                  <textarea value={form.warrantyTerms||''} onChange={e=>setForm(f=>({...f,warrantyTerms:e.target.value}))} rows={2} placeholder="e.g. 5-year comprehensive warranty..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {modal === 'detail' && selected && (
        <Modal title={selected.name} onClose={() => setModal(null)} wide>
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><span className="text-xs text-gray-400">Status</span><div className="mt-1"><StatusBadge status={selected.status} /></div></div>
              <div><span className="text-xs text-gray-400">Capacity</span><div className="font-medium">{selected.systemCapacity ? `${selected.systemCapacity} kW` : '—'}</div></div>
              <div><span className="text-xs text-gray-400">Budget</span><div className="font-medium">{selected.budget ? `$ ${selected.budget.toLocaleString()}` : '—'}</div></div>
            </div>

            {/* Lead Info */}
            {selected.lead && (
              <div className="bg-orange-50 rounded-lg p-4 text-sm">
                <h4 className="font-semibold text-orange-800 mb-2">🎯 Site Assessment: {selected.lead.title}</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  {selected.lead.estimatedCapacity && <div><span className="text-xs text-gray-400 block">Est. Capacity</span>{selected.lead.estimatedCapacity} kW</div>}
                  {selected.lead.proposalAmount && <div><span className="text-xs text-gray-400 block">Proposal Amount</span>$ {(+selected.lead.proposalAmount).toLocaleString()}</div>}
                  {selected.lead.status && <div><span className="text-xs text-gray-400 block">Lead Status</span><StatusBadge status={selected.lead.status} /></div>}
                </div>
              </div>
            )}

            {/* Design Info */}
            {selected.design && (
              <div className="bg-blue-50 rounded-lg p-4 text-sm">
                <h4 className="font-semibold text-blue-800 mb-2">📐 System Design</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  {selected.design.panelCount && <div><span className="text-xs text-gray-400 block">Panels</span>{selected.design.panelCount}</div>}
                  {selected.design.panelType && <div><span className="text-xs text-gray-400 block">Panel Type</span>{selected.design.panelType}</div>}
                  {selected.design.inverterType && <div><span className="text-xs text-gray-400 block">Inverter</span>{selected.design.inverterType}</div>}
                  {selected.design.batteryIncluded !== undefined && <div><span className="text-xs text-gray-400 block">Battery</span>{selected.design.batteryIncluded ? 'Yes' : 'No'}</div>}
                  {selected.design.estimatedOutput && <div><span className="text-xs text-gray-400 block">Est. Output</span>{selected.design.estimatedOutput} kWh/day</div>}
                  {selected.design.notes && <div className="col-span-2"><span className="text-xs text-gray-400 block">Notes</span>{selected.design.notes}</div>}
                </div>
              </div>
            )}

            {/* Warranty */}
            {selected.warranty && (
              <div className="bg-green-50 rounded-lg p-4 text-sm">
                <h4 className="font-semibold text-green-800 mb-2">🛡️ Warranty</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  <div><span className="text-xs text-gray-400 block">Start</span>{new Date(selected.warranty.startDate).toLocaleDateString()}</div>
                  <div><span className="text-xs text-gray-400 block">End</span>{new Date(selected.warranty.endDate).toLocaleDateString()}</div>
                  <div><span className="text-xs text-gray-400 block">Status</span><StatusBadge status={selected.warranty.status} /></div>
                  {selected.warranty.maintenancePeriod && <div><span className="text-xs text-gray-400 block">Maintenance Period</span>{selected.warranty.maintenancePeriod}</div>}
                  {selected.warranty.terms && <div className="col-span-2"><span className="text-xs text-gray-400 block">Warranty Notes</span>{selected.warranty.terms}</div>}
                </div>
              </div>
            )}

            {/* Invoices */}
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoices</p>
                <span className="text-xs text-gray-400">{selected.invoices?.length || 0} linked</span>
              </div>

              {/* Link existing invoice */}
              <div className="px-4 py-2 border-b border-gray-100 flex gap-2 items-center">
                <select value={linkInvId} onChange={e => setLinkInvId(e.target.value)}
                  className="flex-1 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">— Link an existing invoice —</option>
                  {allInvoices
                    .filter(i => !i.projectId)
                    .map(i => (
                      <option key={i.id} value={i.id}>
                        {invCode(i.id, i.createdAt)} — {i.customer?.name || '—'} — $ {(+i.total).toLocaleString()} ({i.status})
                      </option>
                    ))}
                </select>
                <button onClick={linkInvoice} disabled={!linkInvId}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium disabled:opacity-40">
                  Link
                </button>
              </div>

              {selected.invoices?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="border-t border-gray-100 text-xs text-gray-400 uppercase">
                    <tr>{['Code','Customer','Status','Total','Paid','Balance',''].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selected.invoices.map(inv => {
                      const paid    = (inv.payments||[]).reduce((s,p) => s + p.amount, 0);
                      const balance = (+inv.total) - paid;
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-gray-500">{invCode(inv.id, inv.createdAt)}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">{inv.customer?.name||'—'}</td>
                          <td className="px-3 py-2"><StatusBadge status={inv.status} /></td>
                          <td className="px-3 py-2 font-medium">$ {(+inv.total).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                          <td className="px-3 py-2 text-green-600">$ {paid.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                          <td className="px-3 py-2">
                            {balance > 0
                              ? <span className="text-red-600 font-medium">$ {balance.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                              : <span className="text-green-500 text-xs font-semibold">Settled</span>}
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => unlinkInvoice(inv.id)} className="text-xs text-gray-400 hover:text-red-500">Unlink</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-100 text-xs font-semibold">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-gray-500">Total</td>
                      <td className="px-3 py-2">$ {selected.invoices.reduce((s,i) => s + (+i.total||0), 0).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                      <td className="px-3 py-2 text-green-600">$ {selected.invoices.reduce((s,i) => s + (i.payments||[]).reduce((ps,p) => ps + p.amount, 0), 0).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-gray-400">No invoices linked yet. Use the dropdown above to link existing invoices.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => del(selected.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>
              <button onClick={() => openEdit(selected)} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Edit Project</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
