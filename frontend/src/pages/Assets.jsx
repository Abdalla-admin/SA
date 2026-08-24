import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';
import { astCode } from '../utils/docCode';

const STATUSES = ['ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED'];
const DEFAULT_CATS = ['Vehicle', 'Tool', 'Equipment', 'Electronics', 'Furniture', 'Other'];
const emptyForm = { name:'', category:'', status:'ACTIVE', purchaseDate:'', purchaseCost:0, vendorId:'', assignedToId:'', location:'', warrantyExpiry:'', notes:'' };
const emptyLog  = { description:'', cost:0, serviceDate: new Date().toISOString().split('T')[0] };
const fmt = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
  </div>
);

export default function Assets() {
  const { confirm } = useDialog();
  const [items, setItems]         = useState([]);
  const [vendors, setVendors]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal]         = useState(null); // 'form' | 'view' | null
  const [form, setForm]           = useState(emptyForm);
  const [customCat, setCustomCat] = useState(false);
  const [viewed, setViewed]       = useState(null);
  const [logModal, setLogModal]   = useState(false);
  const [logForm, setLogForm]     = useState(emptyLog);
  const [search, setSearch]       = useState('');

  const load = () => client.get('/assets').then(r => setItems(r.data));

  useEffect(() => {
    load();
    client.get('/vendors').then(r => setVendors(r.data));
    client.get('/employees').then(r => setEmployees(r.data));
  }, []);

  const allCats = [...new Set([...DEFAULT_CATS, ...items.map(a => a.category).filter(Boolean)])].sort();

  const filtered = items.filter(a => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [astCode(a.id, a.createdAt), a.name, a.category, a.location, a.status, a.vendor?.name, a.assignedTo?.name]
      .some(v => v?.toLowerCase().includes(q));
  });

  const openNew = () => { setForm(emptyForm); setCustomCat(false); setModal('form'); };
  const openEdit = a => {
    setForm({
      id: a.id,
      name: a.name,
      category: a.category || '',
      status: a.status,
      purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0,10) : '',
      purchaseCost: a.purchaseCost,
      vendorId: a.vendorId || '',
      assignedToId: a.assignedToId || '',
      location: a.location || '',
      warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.slice(0,10) : '',
      notes: a.notes || '',
    });
    setCustomCat(a.category && !DEFAULT_CATS.includes(a.category));
    setModal('form');
  };

  const save = async e => {
    e.preventDefault();
    const payload = {
      ...form,
      purchaseCost: +form.purchaseCost || 0,
      purchaseDate: form.purchaseDate || null,
      warrantyExpiry: form.warrantyExpiry || null,
      vendorId: form.vendorId ? +form.vendorId : null,
      assignedToId: form.assignedToId ? +form.assignedToId : null,
    };
    if (form.id) {
      const { data } = await client.put(`/assets/${form.id}`, payload);
      setItems(i => i.map(x => x.id === data.id ? data : x));
      if (viewed?.id === data.id) setViewed(data);
    } else {
      const { data } = await client.post('/assets', payload);
      setItems(i => [data, ...i]);
    }
    setModal(null);
  };

  const del = async id => {
    if (!await confirm('Delete this asset? This action cannot be undone.')) return;
    await client.delete(`/assets/${id}`);
    setItems(i => i.filter(x => x.id !== id));
    if (viewed?.id === id) setModal(null);
  };

  const openLog = () => { setLogForm(emptyLog); setLogModal(true); };
  const saveLog = async e => {
    e.preventDefault();
    const { data } = await client.post(`/assets/${viewed.id}/maintenance`, logForm);
    setViewed(data);
    setItems(i => i.map(x => x.id === data.id ? data : x));
    setLogModal(false);
  };

  const delLog = async logId => {
    if (!await confirm('Remove this maintenance log entry?')) return;
    const { data } = await client.delete(`/assets/${viewed.id}/maintenance/${logId}`);
    setViewed(data);
    setItems(i => i.map(x => x.id === data.id ? data : x));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        <button onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Asset</button>
      </div>

      <input type="text" placeholder="Search assets..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Code','Name','Category','Status','Assigned To','Location','Cost','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No assets found</td></tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{astCode(a.id, a.createdAt)}</td>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{a.category||'—'}</span></td>
                <td className="px-4 py-3"><StatusBadge status={a.status}/></td>
                <td className="px-4 py-3 text-gray-500">{a.assignedTo?.name || <span className="text-gray-300">Unassigned</span>}</td>
                <td className="px-4 py-3 text-gray-500">{a.location || '—'}</td>
                <td className="px-4 py-3 font-medium">{fmt(a.purchaseCost)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setViewed(a); setModal('view'); }} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    <button onClick={() => openEdit(a)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={() => del(a.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewed && (
        <Modal title={`${astCode(viewed.id, viewed.createdAt)} — ${viewed.name}`} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" value={viewed.category} />
              <Field label="Status" value={<StatusBadge status={viewed.status}/>} />
              <Field label="Purchase Date" value={viewed.purchaseDate ? new Date(viewed.purchaseDate).toLocaleDateString() : null} />
              <Field label="Purchase Cost" value={fmt(viewed.purchaseCost)} />
              <Field label="Vendor" value={viewed.vendor?.name} />
              <Field label="Assigned To" value={viewed.assignedTo?.name} />
              <Field label="Location" value={viewed.location} />
              <Field label="Warranty Expiry" value={viewed.warrantyExpiry ? new Date(viewed.warrantyExpiry).toLocaleDateString() : null} />
              {viewed.notes && (
                <div className="col-span-2">
                  <Field label="Notes" value={viewed.notes} />
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Maintenance Log</p>
                <button onClick={openLog} className="text-xs text-orange-600 hover:underline">+ Log Maintenance</button>
              </div>
              {viewed.maintenanceLogs?.length > 0 ? (
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                      <th className="px-3 py-2 w-8"/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewed.maintenanceLogs.map(l => (
                      <tr key={l.id}>
                        <td className="px-3 py-2">{l.description}</td>
                        <td className="px-3 py-2 text-gray-500">{new Date(l.serviceDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(l.cost)}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={()=>delLog(l.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4 border rounded-lg">No maintenance logged yet</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>openEdit(viewed)} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium">Edit</button>
              <button onClick={()=>del(viewed.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Edit Asset' : 'New Asset'} onClose={() => setModal(null)} wide>
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              {customCat ? (
                <div className="flex gap-2">
                  <input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="Enter category" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <button type="button" onClick={()=>{setCustomCat(false);setForm(f=>({...f,category:''}));}} className="text-xs text-gray-500 hover:text-gray-700 px-2">↩ Pick</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select</option>
                    {allCats.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <button type="button" onClick={()=>setCustomCat(true)} className="text-xs text-orange-600 hover:text-orange-700 px-2 whitespace-nowrap">+ New</button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={e=>setForm(f=>({...f,purchaseDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Cost ($)</label>
              <input type="number" min="0" step="0.01" value={form.purchaseCost} onChange={e=>setForm(f=>({...f,purchaseCost:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vendor (optional)</label>
              <select value={form.vendorId} onChange={e=>setForm(f=>({...f,vendorId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">— None —</option>
                {vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To (optional)</label>
              <select value={form.assignedToId} onChange={e=>setForm(f=>({...f,assignedToId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Unassigned</option>
                {employees.map(emp=><option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Main Office, Site Warehouse" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Expiry</label>
              <input type="date" value={form.warrantyExpiry} onChange={e=>setForm(f=>({...f,warrantyExpiry:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Log Maintenance Modal */}
      {logModal && (
        <Modal title={`Log Maintenance — ${viewed?.name}`} onClose={()=>setLogModal(false)}>
          <form onSubmit={saveLog} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input required value={logForm.description} onChange={e=>setLogForm(f=>({...f,description:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost ($)</label>
                <input type="number" min="0" step="0.01" value={logForm.cost} onChange={e=>setLogForm(f=>({...f,cost:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service Date</label>
                <input type="date" required value={logForm.serviceDate} onChange={e=>setLogForm(f=>({...f,serviceDate:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setLogModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Log</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
