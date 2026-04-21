import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';

const STATUSES = ['PLANNING','DESIGN','PROCUREMENT','EXECUTION','COMMISSIONING','COMPLETED','ON_HOLD'];
const empty = { name:'', customerId:'', systemCapacity:'', status:'PLANNING', budget:'', startDate:'', targetDate:'', progressPct:0, notes:'', warrantyStartDate:'', warrantyEndDate:'', warrantyTerms:'' };

export default function Projects() {
  const { prompt } = useDialog();
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState(null);

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
    const { data } = await client.get(`/projects/${p.id}`);
    setSelected(data); setModal('detail');
  };

  const updateSnag = async (pid, sid, status) => {
    await client.put(`/projects/${pid}/snags/${sid}`, { status, resolvedAt: status === 'RESOLVED' ? new Date() : null });
    const { data } = await client.get(`/projects/${pid}`);
    setSelected(data);
  };

  const updateTest = async (pid, tid, result) => {
    await client.put(`/projects/${pid}/tests/${tid}`, { result, testedAt: new Date() });
    const { data } = await client.get(`/projects/${pid}`);
    setSelected(data);
  };

  const addSnag = async (pid) => {
    const desc = await prompt('Enter snag description:', { title: 'Add Snag Item' });
    if (!desc) return;
    await client.post(`/projects/${pid}/snags`, { description: desc });
    const { data } = await client.get(`/projects/${pid}`);
    setSelected(data);
  };

  const addTest = async (pid) => {
    const name = await prompt('Enter test name:', { title: 'Add Commissioning Test' });
    if (!name) return;
    await client.post(`/projects/${pid}/tests`, { testName: name });
    const { data } = await client.get(`/projects/${pid}`);
    setSelected(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={() => { setForm(empty); setModal('form'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Project</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(p)}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{p.customer?.name}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="space-y-1.5 text-sm text-gray-600">
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
              <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
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
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Terms</label>
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
                <h4 className="font-semibold text-orange-800 mb-2">🎯 Lead: {selected.lead.title}</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  {selected.lead.source && <div><span className="text-xs text-gray-400 block">Source</span>{selected.lead.source}</div>}
                  {selected.lead.estimatedCapacity && <div><span className="text-xs text-gray-400 block">Est. Capacity</span>{selected.lead.estimatedCapacity} kW</div>}
                  {selected.lead.proposalAmount && <div><span className="text-xs text-gray-400 block">Proposal Amount</span>$ {(+selected.lead.proposalAmount).toLocaleString()}</div>}
                  {selected.lead.status && <div><span className="text-xs text-gray-400 block">Lead Status</span><StatusBadge status={selected.lead.status} /></div>}
                  {selected.lead.surveyNotes && <div className="col-span-2"><span className="text-xs text-gray-400 block">Survey Notes</span>{selected.lead.surveyNotes}</div>}
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

            {/* Milestones */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Milestones</h4>
              {selected.milestones?.length === 0 && <p className="text-xs text-gray-400">No milestones</p>}
              {selected.milestones?.map(m => (
                <div key={m.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 text-sm">
                  <span className={m.completedAt ? 'line-through text-gray-400' : ''}>{m.title}</span>
                  <span className="text-xs text-gray-400">{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>

            {/* Snag List */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Snag List</h4>
                <button onClick={() => addSnag(selected.id)} className="text-xs text-orange-600 hover:underline">+ Add</button>
              </div>
              {selected.snagItems?.map(s => (
                <div key={s.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 text-sm">
                  <span className={s.status === 'RESOLVED' ? 'line-through text-gray-400' : ''}>{s.description}</span>
                  <button onClick={() => updateSnag(selected.id, s.id, s.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED')} className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</button>
                </div>
              ))}
            </div>

            {/* Commissioning Tests */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Commissioning Tests</h4>
                <button onClick={() => addTest(selected.id)} className="text-xs text-orange-600 hover:underline">+ Add</button>
              </div>
              {selected.commissioningTests?.map(t => (
                <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 text-sm">
                  <span>{t.testName}</span>
                  <div className="flex gap-1">
                    {['PASS','FAIL','PENDING'].map(r => (
                      <button key={r} onClick={() => updateTest(selected.id, t.id, r)} className={`text-xs px-2 py-0.5 rounded-full border ${t.result === r ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600'}`}>{r}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Warranty */}
            {selected.warranty && (
              <div className="bg-green-50 rounded-lg p-4 text-sm">
                <h4 className="font-semibold text-green-800 mb-2">🛡️ Warranty</h4>
                <div className="grid grid-cols-3 gap-2 text-gray-700">
                  <div><span className="text-xs text-gray-400 block">Start</span>{new Date(selected.warranty.startDate).toLocaleDateString()}</div>
                  <div><span className="text-xs text-gray-400 block">End</span>{new Date(selected.warranty.endDate).toLocaleDateString()}</div>
                  <div><span className="text-xs text-gray-400 block">Status</span><StatusBadge status={selected.warranty.status} /></div>
                  {selected.warranty.terms && <div className="col-span-3"><span className="text-xs text-gray-400 block">Terms</span>{selected.warranty.terms}</div>}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => {
                const w = selected.warranty;
                setForm({
                  ...selected,
                  warrantyStartDate: w?.startDate ? w.startDate.slice(0,10) : '',
                  warrantyEndDate:   w?.endDate   ? w.endDate.slice(0,10)   : '',
                  warrantyTerms:     w?.terms     || '',
                });
                setModal('form');
              }} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm">Edit Project</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
