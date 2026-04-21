import { useEffect, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

const fmt  = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtD = d => d ? new Date(d).toLocaleDateString() : '—';

const TABS = [
  { id:'pl',        label:'P & L' },
  { id:'cashflow',  label:'Cash Flow' },
  { id:'sales',     label:'Sales' },
  { id:'expenses',  label:'Expenses' },
  { id:'inventory', label:'Inventory' },
  { id:'projects',  label:'Projects' },
  { id:'payroll',   label:'Payroll' },
  { id:'leads',     label:'Leads' },
];

function DateFilter({ from, setFrom, to, setTo, onGenerate }) {
  return (
    <div className="flex items-center gap-3 flex-wrap bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-500">From</label>
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-500">To</label>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
      </div>
      <button onClick={onGenerate} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">Generate</button>
    </div>
  );
}

function SummaryCard({ label, value, color = 'text-gray-900', bg = 'bg-white' }) {
  return (
    <div className={`${bg} rounded-xl p-5 shadow-sm border border-gray-100`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

// ─── P&L ────────────────────────────────────────────────────────────────────
function PLReport() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(false);

  const load = async () => {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    const { data: d } = await client.get(`/reports/pl${params}`);
    setData(d);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <DateFilter from={from} setFrom={setFrom} to={to} setTo={setTo} onGenerate={load} />
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard label="Total Revenue"  value={fmt(data.totalRevenue)}  color="text-green-600" />
            <SummaryCard label="Total Expenses" value={fmt(data.totalExpenses)} color="text-red-600" />
            <SummaryCard label="Net Profit" value={fmt(data.netProfit)} color={data.netProfit>=0?'text-blue-600':'text-red-600'} bg={data.netProfit>=0?'bg-blue-50':'bg-red-50'} />
          </div>
          <button onClick={()=>setDetail(v=>!v)} className="text-sm text-orange-600 hover:underline">
            {detail ? '▲ Hide Details' : '▼ Show Detailed Breakdown'}
          </button>
          {detail && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <div className="px-4 py-3 bg-green-50 border-b border-gray-100 text-sm font-semibold text-green-700">Revenue — Payments Received ({data.payments?.length})</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Date','Customer','Method','Amount'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.payments?.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{fmtD(p.paidAt)}</td>
                        <td className="px-3 py-2">{p.invoice?.customer?.name||'—'}</td>
                        <td className="px-3 py-2 text-gray-500">{p.method||'—'}</td>
                        <td className="px-3 py-2 font-medium text-green-600">{fmt(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Expenses */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <div className="px-4 py-3 bg-red-50 border-b border-gray-100 text-sm font-semibold text-red-700">Expenses ({data.expenses?.length})</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Date','Category','Description','Amount'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.expenses?.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{fmtD(e.expenseDate)}</td>
                        <td className="px-3 py-2"><span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs">{e.category||'—'}</span></td>
                        <td className="px-3 py-2 text-gray-600">{e.description||'—'}</td>
                        <td className="px-3 py-2 font-medium text-red-600">{fmt(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Cash Flow ───────────────────────────────────────────────────────────────
function CashFlowReport() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [data, setData] = useState(null);

  const load = async () => {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    const { data: d } = await client.get(`/reports/cashflow${params}`);
    setData(d);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <DateFilter from={from} setFrom={setFrom} to={to} setTo={setTo} onGenerate={load} />
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Cash In (Payments)"   value={fmt(data.totalIn)}  color="text-green-600" />
          <SummaryCard label="Cash Out (Expenses)"  value={fmt(data.totalOut)} color="text-red-600" />
          <SummaryCard label="Net Cash Flow"        value={fmt(data.net)}      color={data.net>=0?'text-blue-600':'text-red-600'} bg={data.net>=0?'bg-blue-50':'bg-red-50'} />
        </div>
      )}
    </div>
  );
}

// ─── Sales ───────────────────────────────────────────────────────────────────
function SalesReport() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(false);

  const load = async () => {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    const { data: d } = await client.get(`/reports/sales${params}`);
    setData(d);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <DateFilter from={from} setFrom={setFrom} to={to} setTo={setTo} onGenerate={load} />
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.byStatus?.map(s => (
              <div key={s.status} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <StatusBadge status={s.status} />
                <div className="mt-2 font-bold text-gray-900">{fmt(s._sum?.total||0)}</div>
                <div className="text-xs text-gray-400">{s._count} invoice{s._count!==1?'s':''}</div>
              </div>
            ))}
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-sm font-semibold text-orange-800">
            Total Invoiced: {fmt(data.total)}
          </div>
          <button onClick={()=>setDetail(v=>!v)} className="text-sm text-orange-600 hover:underline">
            {detail ? '▲ Hide Invoice List' : '▼ Show Invoice List'}
          </button>
          {detail && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['INV #','Customer','Due Date','Total','Paid','Status'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.invoices?.map(inv => {
                    const paid = (inv.payments||[]).reduce((s,p)=>s+ +p.amount,0);
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-500">INV-{String(inv.id).padStart(4,'0')}</td>
                        <td className="px-4 py-2 font-medium">{inv.customer?.name||'—'}</td>
                        <td className="px-4 py-2 text-gray-500">{fmtD(inv.dueDate)}</td>
                        <td className="px-4 py-2 font-medium">{fmt(inv.total)}</td>
                        <td className="px-4 py-2 text-green-600">{paid>0?fmt(paid):'—'}</td>
                        <td className="px-4 py-2"><StatusBadge status={inv.status}/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Expenses ────────────────────────────────────────────────────────────────
function ExpensesReport() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(false);

  const load = async () => {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    const { data: d } = await client.get(`/reports/expenses${params}`);
    setData(d);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <DateFilter from={from} setFrom={setFrom} to={to} setTo={setTo} onGenerate={load} />
      {data && (
        <>
          <div className="bg-red-50 rounded-xl p-4 text-sm font-semibold text-red-800">
            Total Expenses: {fmt(data.total)}
          </div>
          {/* By category */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">By Category</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Category','Count','Total'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.byCategory?.map(c => (
                  <tr key={c.category||'uncategorized'} className="hover:bg-gray-50">
                    <td className="px-4 py-2"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs capitalize">{c.category||'Uncategorized'}</span></td>
                    <td className="px-4 py-2 text-gray-500">{c._count}</td>
                    <td className="px-4 py-2 font-semibold text-red-600">{fmt(c._sum?.amount||0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={()=>setDetail(v=>!v)} className="text-sm text-orange-600 hover:underline">
            {detail ? '▲ Hide Detailed List' : '▼ Show Detailed List'}
          </button>
          {detail && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Date','Category','Description','Project','Amount'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.expenses?.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{fmtD(e.expenseDate)}</td>
                      <td className="px-4 py-2"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs capitalize">{e.category||'—'}</span></td>
                      <td className="px-4 py-2 text-gray-700">{e.description||'—'}</td>
                      <td className="px-4 py-2 text-gray-500">{e.project?.name||'—'}</td>
                      <td className="px-4 py-2 font-medium text-red-600">{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Inventory ───────────────────────────────────────────────────────────────
function InventoryReport() {
  const [data, setData] = useState(null);
  useEffect(() => { client.get('/reports/inventory').then(r => setData(r.data)); }, []);

  if (!data) return null;
  const totalValue = data.reduce((s,m)=>s+m.totalValue,0);
  const lowCount   = data.filter(m=>m.lowStock).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Total Stock Value"   value={fmt(totalValue)}   color="text-blue-600" />
        <SummaryCard label="Total Materials"     value={data.length}        color="text-gray-900" />
        <SummaryCard label="Low Stock Items"     value={lowCount}           color={lowCount>0?'text-red-600':'text-green-600'} />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Material','Category','Stock','Unit','Unit Cost','Total Value','Status'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(m => (
              <tr key={m.id} className={`hover:bg-gray-50 ${m.lowStock?'bg-red-50':''}`}>
                <td className="px-4 py-2 font-medium">{m.name}</td>
                <td className="px-4 py-2"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{m.category||'—'}</span></td>
                <td className="px-4 py-2 font-semibold">{m.quantity} {m.unit}</td>
                <td className="px-4 py-2 text-gray-500">{m.unit}</td>
                <td className="px-4 py-2">{fmt(m.unitCost)}</td>
                <td className="px-4 py-2 font-medium">{fmt(m.totalValue)}</td>
                <td className="px-4 py-2">{m.lowStock?<span className="text-xs text-red-600 font-medium">⚠ Low</span>:<span className="text-xs text-green-600">OK</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Projects ────────────────────────────────────────────────────────────────
function ProjectsReport() {
  const [data, setData] = useState(null);
  useEffect(() => { client.get('/reports/projects').then(r => setData(r.data)); }, []);

  if (!data) return null;
  const totalContract = data.reduce((s,p)=>s+p.contractValue,0);
  const totalExp      = data.reduce((s,p)=>s+p.totalExpenses,0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Total Contract Value" value={fmt(totalContract)} color="text-green-600" />
        <SummaryCard label="Total Expenses"       value={fmt(totalExp)}      color="text-red-600" />
        <SummaryCard label="Gross Margin"         value={fmt(totalContract-totalExp)} color={totalContract-totalExp>=0?'text-blue-600':'text-red-600'} />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Project','Customer','Status','Contract Value','Invoiced','Expenses','Margin','Warranty'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(p => {
              const margin = p.contractValue - p.totalExpenses;
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-gray-500">{p.customer?.name||'—'}</td>
                  <td className="px-4 py-2"><StatusBadge status={p.status}/></td>
                  <td className="px-4 py-2">{fmt(p.contractValue)}</td>
                  <td className="px-4 py-2">{fmt(p.totalInvoiced)}</td>
                  <td className="px-4 py-2 text-red-500">{fmt(p.totalExpenses)}</td>
                  <td className={`px-4 py-2 font-semibold ${margin>=0?'text-green-600':'text-red-600'}`}>{fmt(margin)}</td>
                  <td className="px-4 py-2">{p.warranty?<StatusBadge status={p.warranty.status}/>:'—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Payroll ─────────────────────────────────────────────────────────────────
function PayrollReport() {
  const [data, setData] = useState(null);
  useEffect(() => { client.get('/reports/payroll').then(r => setData(r.data)); }, []);

  if (!data) return null;
  const grandTotal = data.reduce((s,r)=>s+r.total,0);

  return (
    <div className="space-y-4">
      <SummaryCard label="Total Payroll (All Time)" value={fmt(grandTotal)} color="text-purple-600" />
      {data.map(run => (
        <div key={run.key} className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold text-gray-700">{new Date(run.year, run.month-1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
            <span className="font-bold text-purple-600">{fmt(run.total)}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase">
              <tr>{['Employee','Position','Basic','Allowances','Deductions','Net Pay'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {run.payslips.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.employee?.name}</td>
                  <td className="px-4 py-2 text-gray-500">{p.employee?.position||'—'}</td>
                  <td className="px-4 py-2">{fmt(p.basicSalary)}</td>
                  <td className="px-4 py-2 text-green-600">+{fmt(p.allowances)}</td>
                  <td className="px-4 py-2 text-red-600">-{fmt(p.deductions)}</td>
                  <td className="px-4 py-2 font-bold">{fmt(p.netPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Leads ───────────────────────────────────────────────────────────────────
function LeadsReport() {
  const [data, setData] = useState(null);
  useEffect(() => { client.get('/reports/leads').then(r => setData(r.data)); }, []);

  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Leads"      value={data.total}               color="text-gray-900" />
        <SummaryCard label="Pipeline Value"   value={fmt(data.pipelineValue)}  color="text-orange-600" />
        <SummaryCard label="Contracted"       value={data.byStatus?.find(s=>s.status==='CONTRACTED')?._count||0} color="text-green-600" />
        <SummaryCard label="Lost"             value={data.byStatus?.find(s=>s.status==='LOST')?._count||0}       color="text-red-600" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h4 className="font-semibold text-sm mb-3 text-gray-700">Pipeline by Status</h4>
          {data.byStatus?.map(s => (
            <div key={s.status} className="flex justify-between items-center py-1.5 border-b border-gray-50 text-sm">
              <StatusBadge status={s.status}/>
              <div className="flex gap-4">
                <span className="font-semibold text-gray-700">{s._count}</span>
                {s._sum?.proposalAmount > 0 && <span className="text-gray-400">{fmt(s._sum.proposalAmount)}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h4 className="font-semibold text-sm mb-3 text-gray-700">By Source</h4>
          {data.bySource?.map(s => (
            <div key={s.source||'Unknown'} className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
              <span className="text-gray-600">{s.source||'Unknown'}</span>
              <span className="font-semibold">{s._count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [tab, setTab] = useState('pl');

  const panels = {
    pl:        <PLReport />,
    cashflow:  <CashFlowReport />,
    sales:     <SalesReport />,
    expenses:  <ExpensesReport />,
    inventory: <InventoryReport />,
    projects:  <ProjectsReport />,
    payroll:   <PayrollReport />,
    leads:     <LeadsReport />,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      <div className="flex gap-1 border-b flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===t.id?'border-orange-500 text-orange-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div>{panels[tab]}</div>
    </div>
  );
}
