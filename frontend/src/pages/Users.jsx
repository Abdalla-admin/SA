import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

const ROLES = ['ADMIN','CEO','FINANCE_MANAGER','ENGINEERING_MANAGER','PROJECT_COORDINATOR','ACCOUNTANT','TECHNICIAN'];
const empty = { name:'', email:'', password:'', role:'TECHNICIAN', active:true };

const roleColors = {
  ADMIN:                'bg-red-100 text-red-700',
  CEO:                  'bg-purple-100 text-purple-700',
  FINANCE_MANAGER:      'bg-blue-100 text-blue-700',
  ENGINEERING_MANAGER:  'bg-indigo-100 text-indigo-700',
  PROJECT_COORDINATOR:  'bg-cyan-100 text-cyan-700',
  ACCOUNTANT:           'bg-teal-100 text-teal-700',
  TECHNICIAN:           'bg-green-100 text-green-700',
};

export default function Users() {
  const [items, setItems]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(empty);
  const { user: me }        = useAuth();
  const { confirm, alert }  = useDialog();

  useEffect(() => { client.get('/users').then(r => setItems(r.data)); }, []);

  const save = async e => {
    e.preventDefault();
    const payload = { ...form };
    if (form.id && !payload.password) delete payload.password;
    if (form.id) {
      const { data } = await client.put(`/users/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/users', payload);
      setItems(i => [data, ...i]);
    }
    setModal(false);
  };

  const del = async id => {
    if (id === me?.id) { await alert('You cannot delete your own account.'); return; }
    if (!await confirm('Delete this user? This action cannot be undone.')) return;
    await client.delete(`/users/${id}`);
    setItems(i => i.filter(x => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button onClick={()=>{setForm(empty);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add User</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Name','Email','Role','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(u=>(
              <tr key={u.id} className={`hover:bg-gray-50 ${u.id===me?.id?'bg-blue-50':''}`}>
                <td className="px-4 py-3 font-medium">
                  {u.name}
                  {u.id===me?.id && <span className="ml-1 text-xs text-blue-500">(you)</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]||'bg-gray-100 text-gray-700'}`}>
                    {u.role?.replace(/_/g,' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                    {u.active?'Active':'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={()=>{setForm({...u,password:''});setModal(true);}} className="text-blue-600 hover:underline text-xs">Edit</button>
                  {u.id!==me?.id && <button onClick={()=>del(u.id)} className="text-red-500 hover:underline text-xs">Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={form.id?'Edit User':'Add User'} onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {[['Name','name','text',true],['Email','email','email',true]].map(([l,k,t,req])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} required={!!req} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Password{form.id && <span className="text-gray-400"> (leave blank to keep)</span>}
              </label>
              <input type="password" required={!form.id} value={form.password||''} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder={form.id?'••••••••':''} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {ROLES.map(r=><option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} className="accent-orange-500"/>
              <label htmlFor="active" className="text-sm text-gray-700">Active</label>
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
