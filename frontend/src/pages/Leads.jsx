import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useDialog } from '../context/DialogContext';

const PIPELINE_STATUSES = ['NEW','SURVEY_SCHEDULED','SURVEY_DONE','PROPOSAL_SENT','CEO_APPROVAL_PENDING','CEO_APPROVED','CLIENT_APPROVAL_PENDING','CLIENT_APPROVED','CONTRACTED','LOST'];
const CUSTOMER_TYPES = ['Industrial','Commercial','Residential','Agricultural','Walk-In'];
const SYSTEM_TYPES = ['Solar Floating System (River)','Solar Water Pumping (Borehole)','Solar Hybrid System','Solar Rooftop System','Off-Grid System'];
const STRUCTURE_TYPES = ['Galvanized box type (welding structure)','Rooftop Structure','Ground Mount Structure','Floating Structure'];

const emptyNew = {
  formType:'NEW', title:'', customerId:'', assessmentTypeName:'',
  siteAddress:'', estimatedPowerPerMonth:'', avgPowerLastMonths:'',
  powerSource:'', highestMonthlyCost:'', unitCostPerKw:'', estimatedDailyKwh:'', siteOwnership:'',
  coordinatorId:'', surveyDate:'', assessmentStatus:'',
  customerType:'',
  systemType:'', estimatedCapacity:'', batteryStorage:'', pumpSize:'',
  structureType:'', shading:'', availableArea:'', areaLength:'', areaWidth:'',
  gpsLatitude:'', gpsLongitude:'',
  purposeOfUse:'', requiredTime:'',
  proposalAmount:'', paymentMethod:'',
  registeredDate:'', followUpDate:'',
  notes:'', status:'NEW',
};

const emptyMaint = {
  formType:'MAINTENANCE', title:'', customerId:'', assessmentTypeName:'',
  siteAddress:'', installedDate:'',
  coordinatorId:'', surveyDate:'', assessmentStatus:'',
  customerType:'',
  systemType:'', estimatedCapacity:'', batteryStorage:'', pumpSize:'',
  structureType:'', shading:'',
  maintenancePurpose:'',
  notes:'', status:'NEW',
};

const Sec = ({ children }) => (
  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider col-span-2 pt-3 border-t border-gray-100 mt-1 first:pt-0 first:border-t-0">{children}</p>
);

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
  </div>
);

export default function Leads() {
  const { confirm } = useDialog();
  const [leads, setLeads]         = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers]         = useState([]);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(emptyNew);
  const [detail, setDetail]       = useState(null);
  const [activeTab, setActiveTab] = useState('NEW');
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCust, setNewCust]     = useState({ name:'', phone:'', email:'', address:'' });

  useEffect(() => {
    client.get('/leads').then(r => setLeads(r.data));
    client.get('/customers').then(r => setCustomers(r.data));
    client.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async e => {
    e.preventDefault();
    const payload = {
      ...form,
      customerId: form.customerId ? +form.customerId : null,
      coordinatorId: form.coordinatorId ? +form.coordinatorId : null,
      estimatedCapacity: form.estimatedCapacity ? +form.estimatedCapacity : null,
      proposalAmount: form.proposalAmount ? +form.proposalAmount : null,
      estimatedPowerPerMonth: form.estimatedPowerPerMonth ? +form.estimatedPowerPerMonth : null,
      highestMonthlyCost: form.highestMonthlyCost ? +form.highestMonthlyCost : null,
      unitCostPerKw: form.unitCostPerKw ? +form.unitCostPerKw : null,
      estimatedDailyKwh: form.estimatedDailyKwh ? +form.estimatedDailyKwh : null,
      availableArea: form.availableArea ? +form.availableArea : null,
      areaLength: form.areaLength ? +form.areaLength : null,
      areaWidth: form.areaWidth ? +form.areaWidth : null,
    };
    if (form.id) {
      const { data } = await client.put(`/leads/${form.id}`, payload);
      setLeads(l => l.map(x => x.id === data.id ? data : x));
    } else {
      const { data } = await client.post('/leads', payload);
      setLeads(l => [data, ...l]);
    }
    setModal(null);
  };

  const approve = async (id, action) => {
    const { data } = await client.post(`/leads/${id}/${action}`);
    setLeads(l => l.map(x => x.id === data.id ? data : x));
    setDetail(data);
  };

  const del = async id => {
    if (!await confirm('Delete this assessment? This action cannot be undone.')) return;
    await client.delete(`/leads/${id}`);
    setLeads(l => l.filter(x => x.id !== id));
    if (modal === 'detail') setModal(null);
  };

  const openNew  = () => { setForm(activeTab === 'NEW' ? emptyNew : emptyMaint); setNewCustOpen(false); setModal('form'); };
  const openEdit = lead => { setForm(lead); setNewCustOpen(false); setModal('form'); };

  const saveNewCust = async () => {
    if (!newCust.name.trim()) return;
    const { data } = await client.post('/customers', newCust);
    setCustomers(c => [data, ...c]);
    setForm(f => ({ ...f, customerId: data.id }));
    setNewCust({ name:'', phone:'', email:'', address:'' });
    setNewCustOpen(false);
  };

  const filtered = leads.filter(l => (l.formType || 'NEW') === activeTab);
  const newCount  = leads.filter(l => (l.formType || 'NEW') === 'NEW').length;
  const maintCount = leads.filter(l => l.formType === 'MAINTENANCE').length;

  const inp = (label, key, type = 'text', req = false) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{req && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type} required={req}
        value={form[key] ?? ''}
        onChange={set(key)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
  );

  const sel = (label, key, opts, placeholder = 'Select...') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={form[key] ?? ''} onChange={set(key)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
        <option value="">{placeholder}</option>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Site Assessments</h1>
        <button onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + {activeTab === 'NEW' ? 'New Site Assessment' : 'New Maintenance Assessment'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[['NEW','New Assessments', newCount],['MAINTENANCE','Maintenance', maintCount]].map(([val, label, count]) => (
          <button key={val} onClick={() => setActiveTab(val)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === val ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === val ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {activeTab === 'NEW'
                ? ['Site Name','Customer','System Type','Solar PV','Battery','Coordinator','Survey Date','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)
                : ['Site Name','Customer','System Type','Solar PV','Installed Date','Coordinator','Survey Date','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)
              }
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium cursor-pointer text-orange-600 hover:underline" onClick={() => { setDetail(l); setModal('detail'); }}>{l.title}</td>
                <td className="px-4 py-3 text-gray-600">{l.customer?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{l.systemType || '—'}</td>
                <td className="px-4 py-3">{l.estimatedCapacity ? `${l.estimatedCapacity} kWp` : '—'}</td>
                {activeTab === 'NEW' && <td className="px-4 py-3 text-gray-500">{l.batteryStorage || '—'}</td>}
                {activeTab === 'MAINTENANCE' && <td className="px-4 py-3 text-gray-500">{l.installedDate ? new Date(l.installedDate).toLocaleDateString() : '—'}</td>}
                <td className="px-4 py-3">{l.coordinator?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{l.surveyDate ? new Date(l.surveyDate).toLocaleDateString() : '—'}</td>
                {activeTab === 'NEW' && <td className="px-4 py-3"><StatusBadge status={l.status} /></td>}
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setDetail(l); setModal('detail'); }} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                    <button onClick={() => openEdit(l)} className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Edit</button>
                    <button onClick={() => del(l.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">No assessments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={form.id ? `Edit ${form.formType === 'MAINTENANCE' ? 'Maintenance' : 'Site'} Assessment` : (form.formType === 'MAINTENANCE' ? 'New Maintenance Assessment' : 'New Site Assessment')} onClose={() => setModal(null)} wide>
          <form onSubmit={save}>
            {/* Type toggle (only when creating new) */}
            {!form.id && (
              <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-lg w-fit">
                {[['NEW','New Site Assessment'],['MAINTENANCE','Maintenance Assessment']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setForm(val === 'NEW' ? emptyNew : emptyMaint)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${form.formType === val ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">

              {/* ── 1. Site Information ── */}
              <Sec>1. Site Information</Sec>
              {inp('Site Name', 'title', 'text', true)}
              {inp('Assessment Type', 'assessmentTypeName')}
              {inp('Address', 'siteAddress')}
              {form.formType === 'NEW' && <>
                {inp('Estimated Power Consumption Per Month', 'estimatedPowerPerMonth', 'number')}
                {inp('Average Power Consumption Last 3 or 6 Months', 'avgPowerLastMonths')}
                {inp('Power Source', 'powerSource')}
                {inp('Highest Monthly Electricity Cost ($)', 'highestMonthlyCost', 'number')}
                {inp('Unit Cost (1kW) $', 'unitCostPerKw', 'number')}
                {inp('Estimated Daily Power Consumption (kWh)', 'estimatedDailyKwh', 'number')}
                {inp('Site Ownership', 'siteOwnership')}
              </>}
              {form.formType === 'MAINTENANCE' &&
                inp('Installed Date', 'installedDate', 'date')
              }

              {/* ── 2. Surveying ── */}
              <Sec>2. Surveying</Sec>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
                <select value={form.coordinatorId || ''} onChange={set('coordinatorId')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">One of the Technical Employees</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              {inp('Survey Date', 'surveyDate', 'date')}
              {inp('Assessment Status', 'assessmentStatus')}

              {/* ── 3. Customer ── */}
              <Sec>3. Customer</Sec>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
                <div className="flex gap-2">
                  <select value={form.customerId || ''} onChange={set('customerId')} className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setNewCustOpen(v => !v)}
                    className="px-3 py-2 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 text-sm font-medium whitespace-nowrap">
                    + New
                  </button>
                </div>
                {newCustOpen && (
                  <div className="mt-2 p-3 border border-orange-200 rounded-lg bg-orange-50 space-y-2">
                    <p className="text-xs font-semibold text-orange-600">Quick Add Customer</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Full Name *" value={newCust.name} onChange={e => setNewCust(c => ({ ...c, name: e.target.value }))}
                        className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      <input placeholder="Phone" value={newCust.phone} onChange={e => setNewCust(c => ({ ...c, phone: e.target.value }))}
                        className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      <input placeholder="Email" value={newCust.email} onChange={e => setNewCust(c => ({ ...c, email: e.target.value }))}
                        className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      <input placeholder="Address" value={newCust.address} onChange={e => setNewCust(c => ({ ...c, address: e.target.value }))}
                        className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={saveNewCust} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Add & Select</button>
                      <button type="button" onClick={() => setNewCustOpen(false)} className="border px-3 py-1.5 rounded-lg text-xs">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              {sel('Customer Type', 'customerType', CUSTOMER_TYPES)}

              {/* ── 4. System Type & Capacity ── */}
              <Sec>4. System Type &amp; Capacity</Sec>
              {sel('System Type', 'systemType', SYSTEM_TYPES)}
              {inp(`${form.formType === 'MAINTENANCE' ? 'Existing ' : ''}Solar PV Size (kWp)`, 'estimatedCapacity', 'number')}
              {inp(`${form.formType === 'MAINTENANCE' ? 'Existing ' : ''}Battery Storage (kWh)`, 'batteryStorage')}
              {inp('Pump Size (kW)', 'pumpSize')}

              {/* ── 5. Site Technical Details ── */}
              <Sec>5. Site Technical Details</Sec>
              {inp('Shading (Trees, Buildings, Water Tank)', 'shading')}
              {sel(`${form.formType === 'MAINTENANCE' ? 'Existing ' : ''}Structure Type`, 'structureType', STRUCTURE_TYPES)}
              {form.formType === 'NEW' && <>
                {inp('Available Area (m²)', 'availableArea', 'number')}
                {inp('Length (m)', 'areaLength', 'number')}
                {inp('Width (m)', 'areaWidth', 'number')}
                {inp('GPS Latitude', 'gpsLatitude')}
                {inp('GPS Longitude', 'gpsLongitude')}
              </>}

              {/* ── 6. Customer Need ── */}
              <Sec>6. Customer Need</Sec>
              {form.formType === 'NEW' && <>
                {inp('Purpose of Solar Use', 'purposeOfUse')}
                {inp('Required Time', 'requiredTime')}
              </>}
              {form.formType === 'MAINTENANCE' &&
                inp('Maintenance Purpose', 'maintenancePurpose')
              }
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
                <textarea value={form.notes || ''} onChange={set('notes')} rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>

              {/* ── 7. Solar Investment (NEW only) ── */}
              {form.formType === 'NEW' && <>
                <Sec>7. Solar Investment</Sec>
                {inp('Project Cost (USD)', 'proposalAmount', 'number')}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                  <select value={form.paymentMethod || ''} onChange={set('paymentMethod')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select...</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </>}

              {/* ── 8. Registration Info (NEW only) ── */}
              {form.formType === 'NEW' && <>
                <Sec>8. Registration Info</Sec>
                {inp('Registered Date', 'registeredDate', 'date')}
                {inp('Follow Up Date', 'followUpDate', 'date')}
              </>}

              {/* Pipeline status (NEW only) */}
              {form.formType === 'NEW' && (
                <>
                  <Sec>Pipeline Status</Sec>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select value={form.status} onChange={set('status')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      {PIPELINE_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {modal === 'detail' && detail && (
        <Modal title={detail.title} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            {/* Type badge */}
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${detail.formType === 'MAINTENANCE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
              {detail.formType === 'MAINTENANCE' ? 'Maintenance Assessment' : 'New Site Assessment'}
            </span>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <p className="text-xs font-semibold text-orange-500 uppercase col-span-2">Site Information</p>
              <Field label="Assessment Type" value={detail.assessmentTypeName} />
              <Field label="Address" value={detail.siteAddress} />
              {detail.formType === 'NEW' && <>
                <Field label="Power Consumption / Month" value={detail.estimatedPowerPerMonth ? `${detail.estimatedPowerPerMonth} kWh` : null} />
                <Field label="Avg Consumption (3-6 mo)" value={detail.avgPowerLastMonths} />
                <Field label="Power Source" value={detail.powerSource} />
                <Field label="Highest Monthly Cost" value={detail.highestMonthlyCost ? `$ ${detail.highestMonthlyCost}` : null} />
                <Field label="Unit Cost (1kW)" value={detail.unitCostPerKw ? `$ ${detail.unitCostPerKw}` : null} />
                <Field label="Daily Consumption (kWh)" value={detail.estimatedDailyKwh} />
                <Field label="Site Ownership" value={detail.siteOwnership} />
              </>}
              {detail.formType === 'MAINTENANCE' &&
                <Field label="Installed Date" value={detail.installedDate ? new Date(detail.installedDate).toLocaleDateString() : null} />
              }

              <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">Surveying</p>
              <Field label="Assigned To" value={detail.coordinator?.name} />
              <Field label="Survey Date" value={detail.surveyDate ? new Date(detail.surveyDate).toLocaleDateString() : null} />
              <Field label="Assessment Status" value={detail.assessmentStatus} />

              <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">Customer</p>
              <Field label="Customer" value={detail.customer?.name} />
              <Field label="Customer Type" value={detail.customerType} />

              <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">System Type & Capacity</p>
              <Field label="System Type" value={detail.systemType} />
              <Field label={`${detail.formType === 'MAINTENANCE' ? 'Existing ' : ''}Solar PV`} value={detail.estimatedCapacity ? `${detail.estimatedCapacity} kWp` : null} />
              <Field label="Battery Storage" value={detail.batteryStorage} />
              <Field label="Pump Size" value={detail.pumpSize} />

              <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">Site Technical Details</p>
              <Field label="Shading" value={detail.shading} />
              <Field label="Structure Type" value={detail.structureType} />
              {detail.formType === 'NEW' && <>
                <Field label="Available Area" value={detail.availableArea ? `${detail.availableArea} m²` : null} />
                <Field label="Dimensions" value={detail.areaLength && detail.areaWidth ? `${detail.areaLength}m × ${detail.areaWidth}m` : null} />
                <Field label="GPS" value={detail.gpsLatitude && detail.gpsLongitude ? `${detail.gpsLatitude}, ${detail.gpsLongitude}` : null} />
              </>}

              <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">Customer Need</p>
              {detail.formType === 'NEW' && <>
                <Field label="Purpose of Solar Use" value={detail.purposeOfUse} />
                <Field label="Required Time" value={detail.requiredTime} />
              </>}
              {detail.formType === 'MAINTENANCE' &&
                <Field label="Maintenance Purpose" value={detail.maintenancePurpose} />
              }

              {detail.formType === 'NEW' && <>
                <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">Solar Investment</p>
                <Field label="Project Cost" value={detail.proposalAmount ? `$ ${detail.proposalAmount?.toLocaleString()}` : null} />
                <Field label="Payment Method" value={detail.paymentMethod} />

                <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">Registration Info</p>
                <Field label="Registered Date" value={detail.registeredDate ? new Date(detail.registeredDate).toLocaleDateString() : null} />
                <Field label="Follow Up Date" value={detail.followUpDate ? new Date(detail.followUpDate).toLocaleDateString() : null} />
              </>}

              {detail.notes && (
                <>
                  <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">Additional Notes</p>
                  <p className="col-span-2 text-sm text-gray-700 whitespace-pre-wrap">{detail.notes}</p>
                </>
              )}

              {/* Pipeline status for NEW */}
              {detail.formType === 'NEW' && (
                <>
                  <p className="text-xs font-semibold text-orange-500 uppercase col-span-2 pt-2 border-t">Pipeline Status</p>
                  <div className="col-span-2"><StatusBadge status={detail.status} /></div>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t">
              {detail.formType === 'NEW' && detail.status === 'CEO_APPROVAL_PENDING' && (
                <>
                  <button onClick={() => approve(detail.id, 'ceo-approve')} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm">✓ CEO Approve</button>
                  <button onClick={() => approve(detail.id, 'ceo-reject')} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm">✗ CEO Reject</button>
                </>
              )}
              {detail.formType === 'NEW' && (detail.status === 'CLIENT_APPROVAL_PENDING' || detail.status === 'CLIENT_APPROVED') && (
                <button onClick={() => approve(detail.id, 'client-approve')} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm">✓ Mark as Contracted → Create Project</button>
              )}
              <button onClick={() => openEdit(detail)} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm">Edit</button>
              <button onClick={() => del(detail.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">Delete</button>
            </div>

            {detail.project && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Project Created</span>
                  <span className="font-medium text-gray-800">⚡ {detail.project.name}</span>
                </div>
                <StatusBadge status={detail.project.status} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
