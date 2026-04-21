import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const empty = { projectId:'', type:'CORRECTIVE', description:'', status:'OPEN', scheduledAt:'', notes:'' };
const TYPES = ['PREVENTIVE','CORRECTIVE','WARRANTY_CLAIM'];

export default function Maintenance() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

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
    setModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        <button onClick={()=>{setForm(empty);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Request</button>
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
                <td className="px-4 py-3 text-gray-600">{m.description||'—'}</td>
                <td className="px-4 py-3">{m.warranty?<StatusBadge status={m.warranty.status}/>:'—'}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status}/></td>
                <td className="px-4 py-3 text-gray-500">{m.scheduledAt?new Date(m.scheduledAt).toLocaleDateString():'—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={()=>{setForm(m);setModal(true);}} className="text-blue-600 hover:underline text-xs">Edit</button>
                    {m.status!=='COMPLETED'&&<button onClick={async()=>{const{data}=await client.put(`/maintenance/${m.id}`,{status:'COMPLETED',completedAt:new Date()});setItems(i=>i.map(x=>x.id===data.id?data:x));}} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Complete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={form.id?'Edit Request':'New Maintenance Request'} onClose={()=>setModal(false)}>
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
              <input type="date" value={form.scheduledAt||''} onChange={e=>setForm(f=>({...f,scheduledAt:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {['OPEN','SCHEDULED','IN_PROGRESS','COMPLETED'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
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
