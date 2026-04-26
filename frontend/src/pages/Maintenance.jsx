import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';

const TYPES = [
  'Cleaning Solar Bundles',
  'Dust Removal from Panels',
  'Item Replacement',
  'System Relocation',
  'System Extension',
  'System Inspection',
  'System Efficient Report',
];

const empty = { projectId:'', type:'Cleaning Solar Bundles', description:'', status:'OPEN', scheduledAt:'', notes:'' };

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
  </div>
);

export default function Maintenance() {
  const { confirm } = useDialog();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [viewed, setViewed] = useState(null);

  useEffect(() => {
    client.get('/maintenance').then(r => setItems(r.data));
    client.get('/projects').then(r => setProjects(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, projectId: +form.projectId };
    if (form.id) {
      const { data } = await client.put(`/maintenance/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/maintenance', payload);
      setItems(i => [data, ...i]);
    }
    setModal(null);
  };

  const del = async id => {
    if (!await confirm('Delete this maintenance request? This action cannot be undone.')) return;
    await client.delete(`/maintenance/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
  };

  const complete = async m => {
    const { data } = await client.put(`/maintenance/${m.id}`, { status:'COMPLETED', completedAt: new Date() });
    setItems(i => i.map(x => x.id === data.id ? data : x));
    if (viewed?.id === m.id) setViewed(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        <button onClick={()=>{setForm(empty);setModal('form');}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Request</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Project','Customer','Type','Description','Warranty','Status','Scheduled','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(m=>(
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{m.project?.name}</td>
                <td className="px-4 py-3 text-gray-500">{m.project?.customer?.name||'—'}</td>
                <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{m.type||'—'}</span></td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{m.description||'—'}</td>
                <td className="px-4 py-3">{m.warranty?<StatusBadge status={m.warranty.status}/>:'—'}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status}/></td>
                <td className="px-4 py-3 text-gray-500">{m.scheduledAt?new Date(m.scheduledAt).toLocaleDateString():'—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>{setViewed(m);setModal('view');}} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    <button onClick={()=>{setForm(m);setModal('form');}} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={()=>del(m.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title={`Maintenance — ${viewed.project?.name||''}`} onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Project" value={viewed.project?.name} />
              <Field label="Customer" value={viewed.project?.customer?.name} />
              <Field label="Type" value={viewed.type} />
              <div><p className="text-xs text-gray-400">Status</p><div className="mt-0.5"><StatusBadge status={viewed.status} /></div></div>
              <Field label="Scheduled" value={viewed.scheduledAt ? new Date(viewed.scheduledAt).toLocaleDateString() : null} />
              <Field label="Completed" value={viewed.completedAt ? new Date(viewed.completedAt).toLocaleDateString() : null} />
              {viewed.description && <div className="col-span-2"><Field label="Description" value={viewed.description} /></div>}
              {viewed.notes && <div className="col-span-2"><Field label="Notes" value={viewed.notes} /></div>}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              {viewed.status !== 'COMPLETED' && (
                <button onClick={()=>complete(viewed)} className="px-4 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-sm font-medium">Mark Complete</button>
              )}
              <button onClick={()=>{setForm(viewed);setModal('form');}} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>
              <button onClick={()=>del(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id?'Edit Request':'New Maintenance Request'} onClose={()=>setModal(null)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
              <select required value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
              <input type="date" value={form.scheduledAt?.slice?.(0,10)||''} onChange={e=>setForm(f=>({...f,scheduledAt:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {['OPEN','SCHEDULED','IN_PROGRESS','COMPLETED'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
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
