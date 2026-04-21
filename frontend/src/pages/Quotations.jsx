import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';

const emptyForm = { customerId:'', systemCapacity:'', validUntil:'', subtotal:0, tax:0, total:0, notes:'', items:[{description:'',quantity:1,unitPrice:0,total:0}] };

export default function Quotations() {
  const { prompt } = useDialog();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    client.get('/quotations').then(r => setItems(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
  }, []);

  const recalc = (lineItems) => {
    const sub = lineItems.reduce((s,i)=>s+(+i.quantity * +i.unitPrice),0);
    setForm(f=>({...f,items:lineItems,subtotal:sub,total:sub+f.tax}));
  };

  const setLine = (idx,field,val) => {
    const its=[...form.items];
    its[idx]={...its[idx],[field]:val};
    its[idx].total=+its[idx].quantity * +its[idx].unitPrice;
    recalc(its);
  };

  const save = async e => {
    e.preventDefault();
    const payload={customerId:form.customerId?+form.customerId:null,systemCapacity:form.systemCapacity?+form.systemCapacity:null,validUntil:form.validUntil||null,tax:+form.tax,subtotal:+form.subtotal,total:+form.total,notes:form.notes||null,items:form.items.map(i=>({description:i.description,quantity:+i.quantity,unitPrice:+i.unitPrice,total:+i.quantity*+i.unitPrice}))};
    const {data}=await client.post('/quotations',payload);
    setItems(i=>[data,...i]);
    setModal(false);
  };

  const convert = async id => {
    const dueDate = await prompt('Enter invoice due date:', { placeholder: 'YYYY-MM-DD', title: 'Convert to Invoice' });
    if (!dueDate) return;
    await client.post(`/quotations/${id}/convert`,{dueDate});
    client.get('/quotations').then(r=>setItems(r.data));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <button onClick={()=>{setForm(emptyForm);setModal(true);}} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Quotation</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['#','Customer','Capacity','Total','Valid Until','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(q=>(
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">Q-{String(q.id).padStart(4,'0')}</td>
                <td className="px-4 py-3">{q.customer?.name||'—'}</td>
                <td className="px-4 py-3">{q.systemCapacity?`${q.systemCapacity} kW`:'—'}</td>
                <td className="px-4 py-3 font-medium">$ {q.total?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{q.validUntil?new Date(q.validUntil).toLocaleDateString():'—'}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status}/></td>
                <td className="px-4 py-3">
                  {q.status!=='CONVERTED'&&<button onClick={()=>convert(q.id)} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">→ Invoice</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="New Quotation" onClose={()=>setModal(false)} wide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
                <select value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select</option>
                  {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacity (kW)</label>
                <input type="number" value={form.systemCapacity} onChange={e=>setForm(f=>({...f,systemCapacity:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
                <input type="date" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax ($)</label>
                <input type="number" value={form.tax} onChange={e=>setForm(f=>({...f,tax:+e.target.value,total:f.subtotal+ +e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Line Items</label>
                <button type="button" onClick={()=>recalc([...form.items,{description:'',quantity:1,unitPrice:0,total:0}])} className="text-xs text-orange-600 hover:underline">+ Add</button>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-400 font-medium px-1">
                <span className="col-span-5">Description</span><span className="col-span-2">Qty</span><span className="col-span-2">Unit Price</span><span className="col-span-2 text-right">Total</span><span className="col-span-1"/>
              </div>
              {form.items.map((item,idx)=>(
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <input placeholder="Description" required value={item.description} onChange={e=>setLine(idx,'description',e.target.value)} className="col-span-5 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e=>setLine(idx,'quantity',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <input type="number" placeholder="Unit Price" value={item.unitPrice} onChange={e=>setLine(idx,'unitPrice',e.target.value)} className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <div className="col-span-2 text-right text-sm font-medium text-gray-700">$ {(+item.quantity * +item.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                  <button type="button" onClick={()=>recalc(form.items.filter((_,i)=>i!==idx))} className="col-span-1 text-red-400 text-lg text-center">×</button>
                </div>
              ))}
              <div className="text-right text-sm font-medium">Total: $ {form.total?.toLocaleString()}</div>
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
