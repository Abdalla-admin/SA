import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const empty = { projectId:'', startDate:'', endDate:'', terms:'', status:'ACTIVE' };

export default function Warranty() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    client.get('/warranty').then(r => setItems(r.data));
    client.get('/projects').then(r => setProjects(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, projectId: +form.projectId };
    if (form.id) {
      const { data } = await client.put(`/warranty/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/warranty', payload);
      setItems(i => [data, ...i]);
    }
    setModal(false);
  };

  const daysLeft = (endDate) => Math.ceil((new Date(endDate)-new Date())/(1000*60*60*24));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Warranty</h1>
        <button onClick={()=>{setForm(empty);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Warranty</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Project','Customer','Start','End','Days Left','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(w=>{
              const days=daysLeft(w.endDate);
              return (
                <tr key={w.id} className={`hover:bg-gray-50 ${days<=30&&w.status==='ACTIVE'?'bg-amber-50':''}`}>
                  <td className="px-4 py-3 font-medium">{w.project?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{w.project?.customer?.name||'—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(w.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(w.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${days<=0?'text-red-600':days<=30?'text-amber-600':'text-gray-700'}`}>
                      {days<=0?'Expired':`${days} days`}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={w.status}/></td>
                  <td className="px-4 py-3">
                    <button onClick={()=>{setForm(w);setModal(true);}} className="text-blue-600 hover:underline text-xs">Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={form.id?'Edit Warranty':'New Warranty'} onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
              <select required value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {[['Start Date','startDate','date',true],['End Date','endDate','date',true]].map(([l,k,t,req])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={!!req} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Terms</label>
              <textarea value={form.terms||''} onChange={e=>setForm(f=>({...f,terms:e.target.value}))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
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
