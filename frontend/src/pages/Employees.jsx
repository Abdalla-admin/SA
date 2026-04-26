import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const empty = { name:'', email:'', phone:'', position:'', department:'', salary:0, joinDate:'', active:true };

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
  </div>
);

export default function Employees() {
  const { confirm } = useDialog();
  const [items, setItems]   = useState([]);
  const [modal, setModal]   = useState(null); // 'form' | 'view' | null
  const [form, setForm]     = useState(empty);
  const [viewed, setViewed] = useState(null);

  useEffect(() => { client.get('/employees').then(r => setItems(r.data)); }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form, salary: +form.salary };
    if (form.id) {
      const { data } = await client.put(`/employees/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/employees', payload);
      setItems(i => [data, ...i]);
    }
    setModal(null);
  };

  const del = async id => {
    if (!await confirm('Delete this employee? This action cannot be undone.')) return;
    await client.delete(`/employees/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button onClick={() => { setForm(empty); setModal('form'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Employee</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Name','Position','Department','Salary','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(e=>(
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.name}</td>
                <td className="px-4 py-3">{e.position||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{e.department||'—'}</td>
                <td className="px-4 py-3">$ {e.salary?.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${e.active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{e.active?'Active':'Inactive'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>{ setViewed(e); setModal('view'); }} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    <button onClick={()=>{ setForm(e); setModal('form'); }} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={()=>del(e.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title={viewed.name} onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Position"   value={viewed.position} />
              <Field label="Department" value={viewed.department} />
              <Field label="Email"      value={viewed.email} />
              <Field label="Phone"      value={viewed.phone} />
              <Field label="Salary"     value={viewed.salary ? `$ ${viewed.salary.toLocaleString()}` : null} />
              <Field label="Join Date"  value={viewed.joinDate ? new Date(viewed.joinDate).toLocaleDateString() : null} />
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Status</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${viewed.active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                  {viewed.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>{ setForm(viewed); setModal('form'); }} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>
              <button onClick={()=>del(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id?'Edit Employee':'New Employee'} onClose={()=>setModal(null)}>
          <form onSubmit={save} className="space-y-3">
            {[['Name','name','text',true],['Email','email','email'],['Phone','phone','tel'],['Position','position','text'],['Department','department','text'],['Salary ($)','salary','number'],['Join Date','joinDate','date']].map(([l,k,t,req])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={!!req} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
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
