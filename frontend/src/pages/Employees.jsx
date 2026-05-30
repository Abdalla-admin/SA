import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useDialog } from '../context/DialogContext';

const empty = {
  name:'', email:'', phone:'', address:'', passportNumber:'',
  position:'', contractType:'', department:'', salary:0, joinDate:'', active:true,
  guarantorName:'', guarantorRelationship:'', guarantorPhone:'', guarantorPassport:'',
  notes:'',
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider col-span-2 pt-2 border-t border-gray-100 mt-1">{children}</p>
);

export default function Employees() {
  const { confirm } = useDialog();
  const [items, setItems]   = useState([]);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(empty);
  const [viewed, setViewed] = useState(null);

  useEffect(() => { client.get('/employees').then(r => setItems(r.data)); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

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

  const inp = (label, key, type = 'text', required = false) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input
        type={type}
        required={required}
        value={form[key] ?? ''}
        onChange={set(key)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
  );

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
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider col-span-2">Personal Information</p>
              <Field label="Email"           value={viewed.email} />
              <Field label="Phone"           value={viewed.phone} />
              <Field label="Address"         value={viewed.address} />
              <Field label="Passport Number" value={viewed.passportNumber} />

              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider col-span-2 pt-2 border-t border-gray-100">Employment Details</p>
              <Field label="Position"      value={viewed.position} />
              <Field label="Contract Type" value={viewed.contractType} />
              <Field label="Department"    value={viewed.department} />
              <Field label="Salary"        value={viewed.salary ? `$ ${viewed.salary.toLocaleString()}` : null} />
              <Field label="Join Date"     value={viewed.joinDate ? new Date(viewed.joinDate).toLocaleDateString() : null} />
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${viewed.active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                  {viewed.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider col-span-2 pt-2 border-t border-gray-100">Guarantor Information</p>
              <Field label="Full Name"     value={viewed.guarantorName} />
              <Field label="Relationship"  value={viewed.guarantorRelationship} />
              <Field label="Phone"         value={viewed.guarantorPhone} />
              <Field label="Passport"      value={viewed.guarantorPassport} />

              {viewed.notes && (
                <>
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider col-span-2 pt-2 border-t border-gray-100">Additional Notes</p>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewed.notes}</p>
                  </div>
                </>
              )}
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
        <Modal title={form.id ? 'Edit Employee' : 'New Employee'} onClose={()=>setModal(null)}>
          <form onSubmit={save} className="space-y-4">

            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2">Personal Information</p>
              <div className="grid grid-cols-2 gap-3">
                {inp('Full Name', 'name', 'text', true)}
                {inp('Email', 'email', 'email')}
                {inp('Phone Number', 'phone', 'tel')}
                {inp('Physical Address', 'address')}
                {inp('Passport Number', 'passportNumber')}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2 pt-2 border-t">Employment Details</p>
              <div className="grid grid-cols-2 gap-3">
                {inp('Position', 'position')}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contract Type</label>
                  <select value={form.contractType||''} onChange={set('contractType')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select...</option>
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </div>
                {inp('Department', 'department')}
                {inp('Salary ($)', 'salary', 'number')}
                {inp('Join Date', 'joinDate', 'date')}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.active} onChange={e=>setForm(f=>({...f, active: e.target.value === 'true'}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2 pt-2 border-t">Guarantor Information</p>
              <div className="grid grid-cols-2 gap-3">
                {inp('Full Name', 'guarantorName')}
                {inp('Relationship', 'guarantorRelationship')}
                {inp('Telephone Number', 'guarantorPhone', 'tel')}
                {inp('Passport Number', 'guarantorPassport')}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2 pt-2 border-t">Additional Notes</p>
              <textarea
                value={form.notes||''}
                onChange={set('notes')}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Any additional information..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={()=>setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
