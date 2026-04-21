import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';

const STATUSES = ['NEW','SURVEY_SCHEDULED','SURVEY_DONE','PROPOSAL_SENT','CEO_APPROVAL_PENDING','CEO_APPROVED','CLIENT_APPROVAL_PENDING','CLIENT_APPROVED','CONTRACTED','LOST'];

const empty = { title:'', customerId:'', source:'', systemType:'', estimatedCapacity:'', siteAddress:'', coordinatorId:'', surveyDate:'', surveyNotes:'', requirementReport:'', proposalAmount:'', notes:'', status:'NEW' };

export default function Leads() {
  const { confirm } = useDialog();
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    client.get('/leads').then(r => setLeads(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
    client.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, customerId: form.customerId ? +form.customerId : null, coordinatorId: form.coordinatorId ? +form.coordinatorId : null, estimatedCapacity: form.estimatedCapacity ? +form.estimatedCapacity : null, proposalAmount: form.proposalAmount ? +form.proposalAmount : null };
    if (form.id) {
      const { data } = await client.put(`/leads/${form.id}`, payload);
      setLeads(l => l.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/leads', payload);
      setLeads(l => [data, ...l]);
    }
    setModal(null);
  };

  const approve = async (id, action) => {
    const { data } = await client.post(`/leads/${id}/${action}`);
    setLeads(l => l.map(x => x.id === data.id ? data : x));
    setDetail(data);
  };

  const del = async id => {
    if (!await confirm('Delete this lead? This action cannot be undone.')) return;
    await client.delete(`/leads/${id}`);
    setLeads(l => l.filter(x => x.id !== id));
  };

  const openEdit = lead => { setForm(lead); setModal('form'); };
  const openNew = () => { setForm(empty); setModal('form'); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <button onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Lead</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Title','Customer','System Type','Capacity (kW)','Coordinator','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium cursor-pointer text-orange-600 hover:underline" onClick={() => { setDetail(l); setModal('detail'); }}>{l.title}</td>
                <td className="px-4 py-3 text-gray-600">{l.customer?.name || '—'}</td>
                <td className="px-4 py-3">{l.systemType || '—'}</td>
                <td className="px-4 py-3">{l.estimatedCapacity || '—'}</td>
                <td className="px-4 py-3">{l.coordinator?.name || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(l)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => del(l.id)} className="text-red-500 hover:underline text-xs">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Edit Lead' : 'New Lead'} onClose={() => setModal(null)} wide>
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            {[
              ['Title', 'title', 'text', true],
              ['Site Address', 'siteAddress', 'text'],
              ['Source', 'source', 'text'],
              ['Est. Capacity (kW)', 'estimatedCapacity', 'number'],
              ['Proposal Amount', 'proposalAmount', 'number'],
              ['Survey Date', 'surveyDate', 'date'],
            ].map(([label, key, type, required]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type} required={!!required} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
              <select value={form.customerId || ''} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Coordinator</label>
              <select value={form.coordinatorId || ''} onChange={e => setForm(f => ({ ...f, coordinatorId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select coordinator</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">System Type</label>
              <select value={form.systemType || ''} onChange={e => setForm(f => ({ ...f, systemType: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select type</option>
                {['Residential','Commercial','Industrial','Agricultural'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Survey Notes</label>
              <textarea value={form.surveyNotes || ''} onChange={e => setForm(f => ({ ...f, surveyNotes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {modal === 'detail' && detail && (
        <Modal title={detail.title} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Customer', detail.customer?.name], ['Status', null], ['System Type', detail.systemType], ['Capacity', detail.estimatedCapacity ? `${detail.estimatedCapacity} kW` : null], ['Site', detail.siteAddress], ['Coordinator', detail.coordinator?.name], ['Survey Date', detail.surveyDate ? new Date(detail.surveyDate).toLocaleDateString() : null], ['Proposal', detail.proposalAmount ? `$ ${detail.proposalAmount?.toLocaleString()}` : null]].map(([k, v]) => (
                <div key={k}>
                  <span className="text-gray-400 text-xs">{k}</span>
                  <div className="font-medium mt-0.5">{k === 'Status' ? <StatusBadge status={detail.status} /> : v || '—'}</div>
                </div>
              ))}
            </div>
            {detail.surveyNotes && <div><p className="text-xs text-gray-400">Survey Notes</p><p className="text-sm mt-1">{detail.surveyNotes}</p></div>}
            {detail.notes && <div><p className="text-xs text-gray-400">Notes</p><p className="text-sm mt-1">{detail.notes}</p></div>}
            {/* Approval actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t">
              {detail.status === 'CEO_APPROVAL_PENDING' && (
                <>
                  <button onClick={() => approve(detail.id, 'ceo-approve')} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm">✓ CEO Approve</button>
                  <button onClick={() => approve(detail.id, 'ceo-reject')} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm">✗ CEO Reject</button>
                </>
              )}
              {(detail.status === 'CLIENT_APPROVAL_PENDING' || detail.status === 'CLIENT_APPROVED') && (
                <button onClick={() => approve(detail.id, 'client-approve')} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm">✓ Mark as Contracted → Create Project</button>
              )}
              <button onClick={() => { openEdit(detail); }} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm">Edit</button>
            </div>
            {detail.project && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Project Created</span>
                  <span className="font-medium text-gray-800">⚡ {detail.project.name}</span>
                </div>
                <StatusBadge status={detail.project.status} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
