import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const empty = { projectId:'', status:'DRAFT', systemCapacity:'', panelCount:'', inverterType:'', mountingType:'', designNotes:'', fileUrl:'' };

export default function Designs() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    client.get('/designs').then(r => setDesigns(r.data));
    client.get('/projects').then(r => setProjects(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, projectId: +form.projectId, systemCapacity: form.systemCapacity ? +form.systemCapacity : null, panelCount: form.panelCount ? +form.panelCount : null };
    if (form.id) {
      const { data } = await client.put(`/designs/${form.id}`, payload);
      setDesigns(d => d.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/designs', payload);
      setDesigns(d => [data, ...d]);
    }
    setModal(null);
  };

  const action = async (id, endpoint) => {
    const { data } = await client.post(`/designs/${id}/${endpoint}`);
    setDesigns(d => d.map(x => x.id === data.id ? data : x));
  };

  const canApprove = ['ADMIN','ENGINEERING_MANAGER','CEO'].includes(user?.role);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Designs</h1>
        <button onClick={() => { setForm(empty); setModal('form'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Design</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Project','Customer','Capacity','Panels','Inverter','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {designs.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.project?.name}</td>
                <td className="px-4 py-3 text-gray-500">{d.project?.customer?.name}</td>
                <td className="px-4 py-3">{d.systemCapacity ? `${d.systemCapacity} kW` : '—'}</td>
                <td className="px-4 py-3">{d.panelCount || '—'}</td>
                <td className="px-4 py-3">{d.inverterType || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => { setForm(d); setModal('form'); }} className="text-blue-600 hover:underline text-xs">Edit</button>
                    {canApprove && d.status === 'INTERNAL_REVIEW' && (
                      <button onClick={() => action(d.id, 'eng-approve')} className="text-xs bg-lime-100 text-lime-700 px-2 py-0.5 rounded-full">Eng Approve</button>
                    )}
                    {canApprove && d.status === 'ENG_APPROVED' && (
                      <button onClick={() => action(d.id, 'send-to-client')} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Send to Client</button>
                    )}
                    {d.status === 'SENT_TO_CLIENT' && (
                      <button onClick={() => action(d.id, 'client-approve')} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Client Approved</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'form' && (
        <Modal title={form.id ? 'Edit Design' : 'New Design'} onClose={() => setModal(null)} wide>
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
              <select required value={form.projectId} onChange={e => setForm(f=>({...f,projectId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select project</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {[['Capacity (kW)','systemCapacity','number'],['Panel Count','panelCount','number'],['Inverter Type','inverterType','text'],['Mounting Type','mountingType','text'],['File URL','fileUrl','url']].map(([l,k,t])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {['DRAFT','INTERNAL_REVIEW','ENG_APPROVED','SENT_TO_CLIENT','CLIENT_APPROVED'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Design Notes</label>
              <textarea value={form.designNotes||''} onChange={e=>setForm(f=>({...f,designNotes:e.target.value}))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
