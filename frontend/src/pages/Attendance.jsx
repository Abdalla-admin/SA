import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';

const STATUSES = ['PRESENT','ABSENT','HALF_DAY','LATE'];
const empty = { employeeId:'', date:'', status:'PRESENT', notes:'' };

export default function Attendance() {
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    client.get('/attendance').then(r => setItems(r.data));
    client.get('/employees').then(r => setEmployees(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, employeeId: +form.employeeId };
    if (form.id) {
      const { data } = await client.put(`/attendance/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/attendance', payload);
      setItems(i => [data, ...i]);
    }
    setModal(false);
  };

  const statusColor = { PRESENT:'bg-green-100 text-green-700', ABSENT:'bg-red-100 text-red-700', HALF_DAY:'bg-yellow-100 text-yellow-700', LATE:'bg-orange-100 text-orange-700' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <button onClick={()=>{setForm(empty);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Log Attendance</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Employee','Date','Status','Notes','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(a=>(
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{a.employee?.name}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(a.date).toLocaleDateString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[a.status]}`}>{a.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{a.notes||'—'}</td>
                <td className="px-4 py-3"><button onClick={()=>{setForm(a);setModal(true);}} className="text-blue-600 hover:underline text-xs">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Log Attendance" onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
              <select required value={form.employeeId} onChange={e=>setForm(f=>({...f,employeeId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" required value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
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
