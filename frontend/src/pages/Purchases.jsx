import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function Purchases() {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ vendorId:'', notes:'', items:[{materialId:'',quantity:1,unitCost:0,totalCost:0}] });

  useEffect(() => {
    client.get('/purchases').then(r => setItems(r.data));
    client.get('/vendors').then(r => setVendors(r.data));
    client.get('/materials').then(r => setMaterials(r.data));
  }, []);

  const setLineItem = (idx, field, val) => {
    setForm(f => {
      const its = [...f.items];
      its[idx] = { ...its[idx], [field]: val };
      if (field === 'quantity' || field === 'unitCost') its[idx].totalCost = its[idx].quantity * its[idx].unitCost;
      return { ...f, items: its };
    });
  };

  const save = async e => {
    e.preventDefault();
    const { data } = await client.post('/purchases', { ...form, vendorId: form.vendorId ? +form.vendorId : null, items: form.items.map(i => ({ ...i, materialId: +i.materialId, quantity: +i.quantity, unitCost: +i.unitCost, totalCost: +i.quantity * +i.unitCost })) });
    setItems(i => [data, ...i]);
    setModal(false);
  };

  const receive = async id => {
    await client.post(`/purchases/${id}/receive`);
    client.get('/purchases').then(r => setItems(r.data));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        <button onClick={() => setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New PO</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['PO #','Vendor','Items','Total','Order Date','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(p=>(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">PO-{String(p.id).padStart(4,'0')}</td>
                <td className="px-4 py-3">{p.vendor?.name||'—'}</td>
                <td className="px-4 py-3 text-gray-500">{p.items?.length} items</td>
                <td className="px-4 py-3 font-medium">$ {p.totalAmount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.orderDate).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                <td className="px-4 py-3">
                  {p.status!=='RECEIVED'&&p.status!=='CANCELLED'&&(
                    <button onClick={()=>receive(p.id)} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200">Receive</button>
                  )}
                  {p.status==='RECEIVED'&&(
                    <span className="text-xs text-orange-600">💸 expense logged</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="New Purchase Order" onClose={()=>setModal(false)} wide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
                <select value={form.vendorId} onChange={e=>setForm(f=>({...f,vendorId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select vendor</option>
                  {vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-600">Line Items</label>
                <button type="button" onClick={()=>setForm(f=>({...f,items:[...f.items,{materialId:'',quantity:1,unitCost:0,totalCost:0}]}))} className="text-xs text-orange-600 hover:underline">+ Add Line</button>
              </div>
              {form.items.map((item,idx)=>(
                <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                  <select required value={item.materialId} onChange={e=>setLineItem(idx,'materialId',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select material</option>
                    {materials.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input type="number" placeholder="Qty" required value={item.quantity} onChange={e=>setLineItem(idx,'quantity',+e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Unit Cost" required value={item.unitCost} onChange={e=>setLineItem(idx,'unitCost',+e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                </div>
              ))}
              <div className="text-right text-sm font-medium text-gray-700 mt-2">
                Total: $ {form.items.reduce((s,i)=>s+(+i.quantity * +i.unitCost),0).toLocaleString()}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setModal(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Create PO</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
