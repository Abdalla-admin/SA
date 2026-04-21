import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const empty = { employeeId:'', type:'ANNUAL', startDate:'', endDate:'', notes:'' };

export default function Leave() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    client.get('/leave').then(r => setItems(r.data));
    client.get('/employees').then(r => setEmployees(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const { data } = await client.post('/leave', { ...form, employeeId: +form.employeeId });
    setItems(i => [data, ...i]);
    setModal(false);
  };

  const action = async (id, endpoint) => {
    const { data } = await client.post(`/leave/${id}/${endpoint}`);
    setItems(i => i.map(x => x.id === data.id ? data : x));
  };

  const canApprove = ['ADMIN','CEO','ENGINEERING_MANAGER'].includes(user?.role);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <button onClick={()=>{setForm(empty);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Request Leave</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Employee','Type','Start','End','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(l=>(
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{l.employee?.name}</td>
                <td className="px-4 py-3 text-gray-500">{l.type}</td>
                <td className="px-4 py-3">{new Date(l.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">{new Date(l.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={l.status}/></td>
                <td className="px-4 py-3">
                  {canApprove && l.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <button onClick={()=>action(l.id,'approve')} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Approve</button>
                      <button onClick={()=>action(l.id,'reject')} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Request Leave" onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
              <select required value={form.employeeId} onChange={e=>setForm(f=>({...f,employeeId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {['ANNUAL','SICK','EMERGENCY','UNPAID'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            {[['Start Date','startDate','date'],['End Date','endDate','date']].map(([l,k,t])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Submit</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
