import { useEffect, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const fmt    = n => '$ ' + (+n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtD   = d => d ? new Date(d).toLocaleDateString() : '—';
const fmtQty = n => { const num = +n; return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(4)).toString(); };

const TABS = [
  { id:'pl',        label:'P & L' },
  { id:'cashflow',  label:'Cash Flow' },
  { id:'sales',     label:'Sales' },
  { id:'expenses',  label:'Expenses' },
  { id:'inventory', label:'Inventory' },
  { id:'projects',  label:'Projects' },
  { id:'payroll',   label:'Payroll' },
];

const LOGO = () => window.location.origin + '/logo.png';

const printWindow = (title, dateRange, bodyHtml) => {
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:30px;color:#333;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}
    td{padding:8px 10px;border-bottom:1px solid #f3f4f6}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ea580c;padding-bottom:12px;margin-bottom:20px}
    .company-wrap{display:flex;align-items:center;gap:10px}
    .company-name{font-size:18px;font-weight:bold;color:#1e3a5f}
    .company-tag{font-size:10px;color:#ea580c;font-weight:600}
    .report-title{font-size:20px;font-weight:bold;color:#ea580c;text-align:right}
    .date-range{font-size:11px;color:#6b7280;text-align:right;margin-top:2px}
    .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;display:inline-block;margin:4px}
    .card-label{font-size:11px;color:#6b7280}
    .card-value{font-size:18px;font-weight:bold;margin-top:2px}
    .section{font-weight:bold;background:#f3f4f6;padding:6px 10px;margin-top:8px}
    @page{margin:15mm}
  </style>
  </head><body>
  <div class="header">
    <div class="company-wrap">
      <img src="${LOGO()}" style="height:50px;object-fit:contain" onerror="this.style.display='none'">
      <div><div class="company-name">SUN ARATINGA</div><div class="company-tag">SUNLIGHT INTO ELECTRICITY</div></div>
    </div>
    <div><div class="report-title">${title.toUpperCase()}</div>${dateRange ? `<div class="date-range">${dateRange}</div>` : ''}</div>
  </div>
  ${bodyHtml}
  <script>window.print();<\/script></body></html>`);
  w.document.close();
};

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
function PLRow({ label, value, bold, indent, section, positive, negative }) {
  const isSection = section;
  const color = positive ? 'text-green-700' : negative ? 'text-red-600' : 'text-gray-800';
  return (
    <tr className={`border-b border-gray-100 ${isSection ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
      <td className={`px-4 py-2.5 text-sm ${bold||isSection ? 'font-bold text-gray-900' : 'text-gray-600'} ${indent ? 'pl-8' : ''}`}>
        {label}
      </td>
      <td className={`px-4 py-2.5 text-sm text-right font-${bold||isSection?'bold':'medium'} ${color}`}>
        {value !== null && value !== undefined ? fmt(value) : ''}
      </td>
    </tr>
  );
}

function PLReport() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [data, setData] = useState(null);
  const [showPayments, setShowPayments] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);

  const load = async () => {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    const { data: d } = await client.get(`/reports/pl${params}`);
    setData(d);
  };

  useEffect(() => { load(); }, []);

  if (!data) return <div className="text-gray-400 text-sm py-8 text-center">Loading...</div>;

  // Group expenses by category
  const expByCategory = (data.expenses || []).reduce((acc, e) => {
    const cat = e.category || 'Other';
    acc[cat] = (acc[cat] || 0) + e.amount;
    return acc;
  }, {});
  const purchaseCost = expByCategory['purchase'] || 0;
  const opExpenses   = Object.entries(expByCategory).filter(([c]) => c !== 'purchase');
  const opExpTotal   = opExpenses.reduce((s, [, v]) => s + v, 0);
  const grossProfit  = data.totalRevenue - purchaseCost;
  const netProfit    = grossProfit - opExpTotal;

  return (
    <div className="space-y-4">
      <DateFilter from={from} setFrom={setFrom} to={to} setTo={setTo} onGenerate={load} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Total Income"   value={fmt(data.totalRevenue)}  color="text-green-600" />
        <SummaryCard label="Total Expenses" value={fmt(data.totalExpenses)} color="text-red-600" />
        <SummaryCard label="Net Profit"     value={fmt(netProfit)}          color={netProfit>=0?'text-blue-700':'text-red-600'} bg={netProfit>=0?'bg-blue-50':'bg-red-50'} />
      </div>

      {/* P&L Statement Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <span className="font-semibold text-gray-800 text-sm">Profit & Loss Statement</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{from && to ? `${from} → ${to}` : 'All time'}</span>
            <button onClick={() => {
              const rows = [
                ['REVENUE','',true],['Sales Revenue (Payments Received)',fmt(data.totalRevenue),false],['GROSS REVENUE',fmt(data.totalRevenue),true],
                ['COST OF GOODS SOLD','',true],['Purchase / Material Cost',fmt(purchaseCost),false],['GROSS PROFIT',fmt(grossProfit),true],
                ['OPERATING EXPENSES','',true],...opExpenses.map(([c,v])=>[c,fmt(v),false]),
                ['TOTAL OPERATING EXPENSES',fmt(opExpTotal),true],['NET PROFIT',fmt(netProfit),true],
              ].map(([l,v,b])=>`<tr><td style="${b?'font-weight:bold;background:#f3f4f6':''};padding:8px 12px">${l}</td><td style="${b?'font-weight:bold;background:#f3f4f6':''};text-align:right;padding:8px 12px">${v||''}</td></tr>`).join('');
              printWindow('Profit & Loss Report', from && to ? `${from} → ${to}` : 'All time',
                `<div style="display:flex;gap:16px;margin-bottom:16px">
                  <div class="card"><div class="card-label">Total Income</div><div class="card-value" style="color:#16a34a">${fmt(data.totalRevenue)}</div></div>
                  <div class="card"><div class="card-label">Total Expenses</div><div class="card-value" style="color:#dc2626">${fmt(data.totalExpenses)}</div></div>
                  <div class="card"><div class="card-label">Net Profit</div><div class="card-value" style="color:${netProfit>=0?'#1d4ed8':'#dc2626'}">${fmt(netProfit)}</div></div>
                </div>
                <table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>`
              );
            }} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 font-medium">🖨 Print</button>
          </div>
        </div>
        <table className="w-full">
          <tbody>
            <PLRow label="REVENUE" value={null} section bold />
            <PLRow label="Sales Revenue (Payments Received)" value={data.totalRevenue} indent positive />
            <PLRow label="GROSS REVENUE" value={data.totalRevenue} bold positive />

            <PLRow label="COST OF GOODS SOLD" value={null} section bold />
            <PLRow label="Purchase / Material Cost" value={purchaseCost} indent negative />
            <PLRow label="GROSS PROFIT" value={grossProfit} bold positive={grossProfit>=0} negative={grossProfit<0} />

            <PLRow label="OPERATING EXPENSES" value={null} section bold />
            {opExpenses.map(([cat, amt]) => (
              <PLRow key={cat} label={cat.charAt(0).toUpperCase()+cat.slice(1)} value={amt} indent negative />
            ))}
            {opExpenses.length === 0 && <PLRow label="No operating expenses" value={0} indent />}
            <PLRow label="TOTAL OPERATING EXPENSES" value={opExpTotal} bold negative />

            <PLRow label="NET PROFIT" value={netProfit} bold section positive={netProfit>=0} negative={netProfit<0} />
          </tbody>
        </table>
      </div>

      {/* Detailed drill-down */}
      <div className="space-y-2">
        <button onClick={()=>setShowPayments(v=>!v)} className="text-sm text-orange-600 hover:underline">
          {showPayments ? '▲ Hide Revenue Detail' : '▼ Revenue Detail — Payments Received'}
        </button>
        {showPayments && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Date','Customer','Method','Amount'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.payments?.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{fmtD(p.paidAt)}</td>
                    <td className="px-4 py-2 font-medium">{p.invoice?.customer?.name||'—'}</td>
                    <td className="px-4 py-2 text-gray-500 capitalize">{(p.method||'—').replace('_',' ')}</td>
                    <td className="px-4 py-2 font-medium text-green-600">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={()=>setShowExpenses(v=>!v)} className="text-sm text-orange-600 hover:underline">
          {showExpenses ? '▲ Hide Expense Detail' : '▼ Expense Detail'}
        </button>
        {showExpenses && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Date','Category','Description','Amount'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.expenses?.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{fmtD(e.expenseDate)}</td>
                    <td className="px-4 py-2"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs capitalize">{e.category||'—'}</span></td>
                    <td className="px-4 py-2 text-gray-600">{e.description||'—'}</td>
                    <td className="px-4 py-2 font-medium text-red-600">{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
const INV_STATUSES = ['','PAID','UNPAID','PARTIAL','OVERDUE','CANCELLED'];

function SalesReport() {
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [statusFilter, setStatus] = useState('');
  const [data, setData]         = useState(null);

  const load = async (sf = statusFilter) => {
    const p = new URLSearchParams();
    if (from && to) { p.set('from', from); p.set('to', to); }
    if (sf) p.set('status', sf);
    const qs = p.toString() ? '?' + p.toString() : '';
    const { data: d } = await client.get(`/reports/sales${qs}`);
    setData(d);
  };

  useEffect(() => { load(); }, []);

  const setStatusAndLoad = s => { setStatus(s); load(s); };

  return (
    <div className="space-y-4">
      <DateFilter from={from} setFrom={setFrom} to={to} setTo={setTo} onGenerate={() => load()} />

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {INV_STATUSES.map(s => (
          <button key={s} onClick={() => setStatusAndLoad(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter===s ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {data && (
        <>
          {/* Status breakdown cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {data.byStatus?.map(s => (
              <button key={s.status} onClick={() => setStatusAndLoad(s.status)}
                className={`rounded-xl p-3 shadow-sm border text-left transition-colors ${statusFilter===s.status ? 'border-orange-400 bg-orange-50' : 'bg-white border-gray-100 hover:border-orange-300'}`}>
                <StatusBadge status={s.status} />
                <div className="mt-1.5 font-bold text-gray-900 text-sm">{fmt(s._sum?.total||0)}</div>
                <div className="text-xs text-gray-400">{s._count} inv.</div>
              </button>
            ))}
          </div>

          {/* Summary totals */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Invoiced</p>
              <p className="text-xl font-bold text-gray-900">{fmt(data.total)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Collected</p>
              <p className="text-xl font-bold text-green-700">{fmt(data.collected)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100 text-center">
              <p className="text-xs text-gray-500 mb-1">Outstanding</p>
              <p className="text-xl font-bold text-red-600">{fmt(data.outstanding)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 shadow-sm border border-orange-100 text-center">
              <p className="text-xs text-gray-500 mb-1">Gross Profit</p>
              <p className="text-xl font-bold text-orange-600">{fmt(data.totalProfit)}</p>
            </div>
          </div>

          {/* Invoice table — always visible */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="px-4 py-2 border-b bg-gray-50 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {data.invoices?.length || 0} invoices {statusFilter ? `· ${statusFilter}` : ''}
              </span>
              <button onClick={() => {
                const rows = (data.invoices||[]).map(inv => {
                  const paid = (inv.payments||[]).reduce((s,p)=>s+ +p.amount,0);
                  const bal  = +inv.total - paid;
                  const itemsSummary = (inv.items||[]).map(i=>`${i.description} ×${i.quantity}`).join(', ') || '—';
                  return `<tr><td>SA-INV-${new Date(inv.createdAt).toISOString().slice(0,10).replace(/-/g,'')}-${String(inv.id).padStart(3,'0')}</td><td>${inv.customer?.name||'—'}</td><td>${itemsSummary}</td><td>${fmtD(inv.dueDate)}</td><td style="text-align:right">${fmt(inv.total)}</td><td style="text-align:right;color:#ea580c">${fmt(inv.grossProfit)}</td><td style="text-align:right;color:#16a34a">${paid>0?fmt(paid):'—'}</td><td style="text-align:right;color:#dc2626">${bal>0?fmt(bal):'Settled'}</td><td>${inv.status}</td></tr>`;
                }).join('');
                const totalPaid = data.invoices?.reduce((s,i)=>s+(i.payments||[]).reduce((ps,p)=>ps+ +p.amount,0),0)||0;
                const totalBal  = data.invoices?.reduce((s,i)=>s+(+i.total-(i.payments||[]).reduce((ps,p)=>ps+ +p.amount,0)),0)||0;
                printWindow('Sales Report', (from && to ? `${from} → ${to}` : 'All time') + (statusFilter ? ` · ${statusFilter}` : ''),
                  `<div style="display:flex;gap:12px;margin-bottom:16px">
                    <div class="card"><div class="card-label">Total Invoiced</div><div class="card-value">${fmt(data.total)}</div></div>
                    <div class="card"><div class="card-label">Collected</div><div class="card-value" style="color:#16a34a">${fmt(data.collected)}</div></div>
                    <div class="card"><div class="card-label">Outstanding</div><div class="card-value" style="color:#dc2626">${fmt(data.outstanding)}</div></div>
                    <div class="card"><div class="card-label">Gross Profit</div><div class="card-value" style="color:#ea580c">${fmt(data.totalProfit)}</div></div>
                  </div>
                  <table><thead><tr><th>Code</th><th>Customer</th><th>Items</th><th>Due Date</th><th style="text-align:right">Total</th><th style="text-align:right">Profit</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead>
                  <tbody>${rows}</tbody>
                  <tfoot><tr style="font-weight:bold;background:#f3f4f6"><td colspan="4">TOTAL</td><td style="text-align:right">${fmt(data.total)}</td><td style="text-align:right;color:#ea580c">${fmt(data.totalProfit)}</td><td style="text-align:right;color:#16a34a">${fmt(totalPaid)}</td><td style="text-align:right;color:#dc2626">${fmt(totalBal)}</td><td></td></tr></tfoot></table>`
                );
              }} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 font-medium">🖨 Print</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Code','Customer','Items','Due Date','Total','Profit','Paid','Balance','Status'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.invoices?.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No invoices found</td></tr>
                )}
                {data.invoices?.map(inv => {
                  const paid = (inv.payments||[]).reduce((s,p)=>s+ +p.amount,0);
                  const bal  = +inv.total - paid;
                  const itemsSummary = (inv.items||[]).map(i=>`${i.description} ×${i.quantity}`).join(', ');
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">SA-INV-{new Date(inv.createdAt).toISOString().slice(0,10).replace(/-/g,'')}-{String(inv.id).padStart(3,'0')}</td>
                      <td className="px-4 py-2 font-medium">{inv.customer?.name||'—'}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs max-w-xs truncate" title={itemsSummary}>{itemsSummary||'—'}</td>
                      <td className="px-4 py-2 text-gray-500">{fmtD(inv.dueDate)}</td>
                      <td className="px-4 py-2 font-medium">{fmt(inv.total)}</td>
                      <td className={`px-4 py-2 font-medium ${inv.grossProfit<0?'text-red-600':'text-orange-600'}`}>{fmt(inv.grossProfit)}</td>
                      <td className="px-4 py-2 text-green-600">{paid>0?fmt(paid):'—'}</td>
                      <td className="px-4 py-2">{bal>0?<span className="text-red-600 font-medium">{fmt(bal)}</span>:<span className="text-green-500 text-xs font-semibold">Settled</span>}</td>
                      <td className="px-4 py-2"><StatusBadge status={inv.status}/></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-orange-50 border-t-2 border-orange-200 text-sm font-bold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-gray-700">TOTAL ({data.invoices?.length||0} invoices)</td>
                  <td className="px-4 py-3 text-gray-900">{fmt(data.total)}</td>
                  <td className="px-4 py-3 text-orange-600">{fmt(data.totalProfit)}</td>
                  <td className="px-4 py-3 text-green-700">{fmt(data.collected)}</td>
                  <td className="px-4 py-3 text-red-600">{fmt(data.outstanding)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Expenses ────────────────────────────────────────────────────────────────
function ExpensesReport() {
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');
  const [category, setCat]  = useState('');
  const [data, setData]     = useState(null);
  const [detail, setDetail] = useState(false);

  const load = async (cat = category) => {
    const p = new URLSearchParams();
    if (from && to) { p.set('from', from); p.set('to', to); }
    if (cat) p.set('category', cat);
    const { data: d } = await client.get(`/reports/expenses${p.toString() ? '?' + p.toString() : ''}`);
    setData(d);
  };
  useEffect(() => { load(); }, []);

  const cats = data?.byCategory?.map(c => c.category).filter(Boolean) || [];

  return (
    <div className="space-y-4">
      <DateFilter from={from} setFrom={setFrom} to={to} setTo={setTo} onGenerate={() => load()} />
      {/* Category filter */}
      {cats.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {['', ...cats].map(c => (
            <button key={c} onClick={() => { setCat(c); load(c); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${category===c ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
              {c || 'All Categories'}
            </button>
          ))}
        </div>
      )}
      {data && (
        <>
          <div className="bg-red-50 rounded-xl p-4 text-sm font-semibold text-red-800 flex justify-between items-center">
            <span>Total Expenses: {fmt(data.total)}</span>
            <button onClick={() => {
              const rows = (data.expenses||[]).map(e => {
                const hasItems = e.items?.length > 0;
                const header = `<tr style="background:#fff7ed"><td>${fmtD(e.expenseDate)}</td><td>${e.category||'—'}</td><td>${e.description||(hasItems?`${e.items.length} items`:'—')}</td><td>${e.project?.name||'—'}</td><td style="text-align:right;color:#dc2626;font-weight:bold">${fmt(e.amount)}</td></tr>`;
                const itemRows = hasItems ? e.items.map(i=>`<tr><td></td><td style="font-size:11px;color:#6b7280">↳</td><td style="font-size:11px;padding-left:16px">${i.description} &nbsp;×&nbsp; ${i.quantity} &nbsp;@ ${fmt(i.unitPrice)}</td><td></td><td style="text-align:right;font-size:11px;color:#dc2626">${fmt(i.total)}</td></tr>`).join('') : '';
                return header + itemRows;
              }).join('');
              printWindow('Expenses Report', from && to ? `${from} → ${to}` : 'All time',
                `<table><thead><tr><th>Date</th><th>Category</th><th>Description / Item</th><th>Project</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold;color:#dc2626">${fmt(data.total)}</td></tr></tfoot></table>`
              );
            }} className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-xs text-red-800 font-medium">🖨 Print</button>
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
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Description / Item</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-left">Project</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.expenses?.map(e => {
                    const hasItems = e.items?.length > 0;
                    if (!hasItems) return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">{fmtD(e.expenseDate)}</td>
                        <td className="px-4 py-2"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs capitalize">{e.category||'—'}</span></td>
                        <td className="px-4 py-2 text-gray-700" colSpan={3}>{e.description||'—'}</td>
                        <td className="px-4 py-2 text-gray-500">{e.project?.name||'—'}</td>
                        <td className="px-4 py-2 font-medium text-right text-red-600">{fmt(e.amount)}</td>
                      </tr>
                    );
                    return (
                      <>
                        {/* Expense header row */}
                        <tr key={`h-${e.id}`} className="bg-orange-50">
                          <td className="px-4 py-2 text-gray-500">{fmtD(e.expenseDate)}</td>
                          <td className="px-4 py-2"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs capitalize">{e.category||'—'}</span></td>
                          <td className="px-4 py-2 text-gray-500 italic text-xs" colSpan={3}>{e.description || `${e.items.length} items`}</td>
                          <td className="px-4 py-2 text-gray-500">{e.project?.name||'—'}</td>
                          <td className="px-4 py-2 font-bold text-right text-red-600">{fmt(e.amount)}</td>
                        </tr>
                        {/* Line item rows */}
                        {e.items.map((item, i) => (
                          <tr key={`${e.id}-${i}`} className="hover:bg-gray-50 bg-white">
                            <td className="px-4 py-1.5 text-gray-300 text-xs pl-8">↳</td>
                            <td className="px-4 py-1.5"/>
                            <td className="px-4 py-1.5 text-gray-700 pl-2">{item.description}</td>
                            <td className="px-4 py-1.5 text-right text-gray-500">{item.quantity}</td>
                            <td className="px-4 py-1.5 text-right text-gray-500">{fmt(item.unitPrice)}</td>
                            <td className="px-4 py-1.5"/>
                            <td className="px-4 py-1.5 font-medium text-right text-red-500">{fmt(item.total)}</td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-gray-600">TOTAL</td>
                    <td className="px-4 py-2 text-right text-red-600">{fmt(data.total)}</td>
                  </tr>
                </tfoot>
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
  const [data, setData]     = useState(null);
  const [catFilter, setCat] = useState('');
  const [lowOnly, setLow]   = useState(false);

  useEffect(() => { client.get('/reports/inventory').then(r => setData(r.data)); }, []);

  if (!data) return null;

  const allCats    = [...new Set(data.map(m => m.category).filter(Boolean))];
  const filtered   = data.filter(m => (!catFilter || m.category === catFilter) && (!lowOnly || m.lowStock));
  const totalValue = filtered.reduce((s,m)=>s+m.totalValue,0);
  const lowCount   = data.filter(m=>m.lowStock).length;

  const doPrint = () => {
    const rows = data.map(m=>`<tr style="${m.lowStock?'background:#fef2f2':''}"><td>${m.name}</td><td>${m.category||'—'}</td><td>${m.quantity} ${m.unit}</td><td style="text-align:right">${fmt(m.unitCost)}</td><td style="text-align:right">${fmt(m.totalValue)}</td><td>${m.lowStock?'⚠ Low':'OK'}</td></tr>`).join('');
    printWindow('Inventory Report', null,
      `<div style="display:flex;gap:16px;margin-bottom:16px">
        <div class="card"><div class="card-label">Stock Value</div><div class="card-value" style="color:#1d4ed8">${fmt(totalValue)}</div></div>
        <div class="card"><div class="card-label">Total Items</div><div class="card-value">${data.length}</div></div>
        <div class="card"><div class="card-label">Low Stock</div><div class="card-value" style="color:${lowCount>0?'#dc2626':'#16a34a'}">${lowCount}</div></div>
      </div>
      <table><thead><tr><th>Material</th><th>Category</th><th>Stock</th><th style="text-align:right">Unit Cost</th><th style="text-align:right">Total Value</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Stock Value (filtered)" value={fmt(totalValue)}   color="text-blue-600" />
        <SummaryCard label="Items (filtered)"       value={filtered.length}    color="text-gray-900" />
        <SummaryCard label="Low Stock Items"        value={lowCount}           color={lowCount>0?'text-red-600':'text-green-600'} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {['', ...allCats].map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${catFilter===c ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
            {c || 'All Categories'}
          </button>
        ))}
        <button onClick={() => setLow(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ml-2 ${lowOnly ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}>
          ⚠ Low Stock Only
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="px-4 py-2 border-b bg-gray-50 flex justify-between items-center">
          <span className="text-xs text-gray-500">{filtered.length} items</span>
          <button onClick={doPrint} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 font-medium">🖨 Print</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Material','Category','Stock','Unit Cost','Total Value','Status'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(m => (
              <tr key={m.id} className={`hover:bg-gray-50 ${m.lowStock?'bg-red-50':''}`}>
                <td className="px-4 py-2 font-medium">{m.name}</td>
                <td className="px-4 py-2"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{m.category||'—'}</span></td>
                <td className="px-4 py-2 font-semibold">{fmtQty(m.quantity)} {m.unit}</td>
                <td className="px-4 py-2">{fmt(m.unitCost)}</td>
                <td className="px-4 py-2 font-medium">{fmt(m.totalValue)}</td>
                <td className="px-4 py-2">{m.lowStock?<span className="text-xs text-red-600 font-medium">⚠ Low</span>:<span className="text-xs text-green-600">OK</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-gray-600">TOTAL</td>
              <td className="px-4 py-2 text-blue-700">{fmt(totalValue)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const PRJ_STATUSES = ['','PLANNING','DESIGN','PROCUREMENT','EXECUTION','COMMISSIONING','COMPLETED','ON_HOLD'];

// ─── Projects ────────────────────────────────────────────────────────────────
function ProjectsReport() {
  const [data, setData]         = useState(null);
  const [statusFilter, setStatus] = useState('');
  const [viewed, setViewed]     = useState(null);

  const load = async (sf = statusFilter) => {
    const qs = sf ? `?status=${sf}` : '';
    const { data: d } = await client.get(`/reports/projects${qs}`);
    setData(d);
  };
  useEffect(() => { load(); }, []);

  const openView = async id => {
    const { data: d } = await client.get(`/reports/projects/${id}`);
    setViewed(d);
  };

  const printProjectDetail = p => {
    const balance = p.totalInvoiced - p.totalCollected;
    const invRows = p.invoices.map(inv => {
      const paid = inv.payments.reduce((s,pay)=>s+pay.amount,0);
      return `<tr><td>INV-${String(inv.id).padStart(4,'0')}</td><td>${fmtD(inv.issueDate||inv.createdAt)}</td><td>${inv.status}</td><td style="text-align:right">${fmt(inv.total)}</td><td style="text-align:right;color:#16a34a">${fmt(paid)}</td></tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">No invoices</td></tr>';
    const expRows = p.expenses.map(e =>
      `<tr><td>${fmtD(e.expenseDate)}</td><td>${e.category||'—'}</td><td>${e.description||'—'}</td><td style="text-align:right">${fmt(e.amount)}</td></tr>`
    ).join('') || '<tr><td colspan="4" style="text-align:center;color:#9ca3af">No expenses</td></tr>';
    const lineRows = p.lines.map(l =>
      `<tr><td>${l.description}</td><td style="text-align:right">${fmtQty(l.quantity)}</td><td style="text-align:right">${fmt(l.unitCost)}</td><td style="text-align:right">${fmt(l.unitPrice)}</td><td style="text-align:right;color:${l.profit>=0?'#16a34a':'#dc2626'}">${fmt(l.profit)}</td></tr>`
    ).join('') || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">No line items sold</td></tr>';

    printWindow(`Project Report — ${p.name}`, p.customer?.name || null,
      `<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div class="card"><div class="card-label">Budget (Contract)</div><div class="card-value">${fmt(p.contractValue)}</div></div>
        <div class="card"><div class="card-label">Invoiced</div><div class="card-value">${fmt(p.totalInvoiced)}</div></div>
        <div class="card"><div class="card-label">Collected</div><div class="card-value" style="color:#16a34a">${fmt(p.totalCollected)}</div></div>
        <div class="card"><div class="card-label">Balance</div><div class="card-value" style="color:#dc2626">${fmt(balance)}</div></div>
        <div class="card"><div class="card-label">Expenses</div><div class="card-value" style="color:#dc2626">${fmt(p.totalExpenses)}</div></div>
        <div class="card"><div class="card-label">Gross Profit</div><div class="card-value" style="color:#ea580c">${fmt(p.grossProfit)}</div></div>
      </div>
      <div class="section">INVOICES</div>
      <table><thead><tr><th>Code</th><th>Date</th><th>Status</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th></tr></thead><tbody>${invRows}</tbody></table>
      <div class="section">EXPENSES</div>
      <table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${expRows}</tbody></table>
      <div class="section">GROSS PROFIT PER LINE</div>
      <table><thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Buy Price</th><th style="text-align:right">Sell Price</th><th style="text-align:right">Profit</th></tr></thead>
      <tbody>${lineRows}</tbody>
      <tfoot><tr style="font-weight:bold;background:#f3f4f6"><td colspan="4">TOTAL GROSS PROFIT</td><td style="text-align:right;color:#ea580c">${fmt(p.grossProfit)}</td></tr></tfoot></table>`
    );
  };

  if (!data) return null;
  const totalContract = data.reduce((s,p)=>s+p.contractValue,0);
  const totalExp      = data.reduce((s,p)=>s+p.totalExpenses,0);
  const totalProfit   = data.reduce((s,p)=>s+(p.grossProfit||0),0);

  const doPrint = () => {
    const rows = data.map(p=>{const m=p.contractValue-p.totalExpenses;return`<tr><td>${p.name}</td><td>${p.customer?.name||'—'}</td><td>${p.itemsSummary||'—'}</td><td>${p.status}</td><td style="text-align:right">${fmt(p.contractValue)}</td><td style="text-align:right">${fmt(p.totalInvoiced)}</td><td style="text-align:right;color:#ea580c">${fmt(p.grossProfit)}</td><td style="text-align:right;color:#dc2626">${fmt(p.totalExpenses)}</td><td style="text-align:right;color:${m>=0?'#16a34a':'#dc2626'};font-weight:bold">${fmt(m)}</td></tr>`;}).join('');
    printWindow('Projects Report', null,
      `<table><thead><tr><th>Project</th><th>Customer</th><th>Items</th><th>Status</th><th style="text-align:right">Contract</th><th style="text-align:right">Invoiced</th><th style="text-align:right">Gross Profit</th><th style="text-align:right">Expenses</th><th style="text-align:right">Margin</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:bold;background:#f3f4f6"><td colspan="4">TOTAL</td><td style="text-align:right">${fmt(totalContract)}</td><td style="text-align:right">${fmt(data.reduce((s,p)=>s+p.totalInvoiced,0))}</td><td style="text-align:right;color:#ea580c">${fmt(totalProfit)}</td><td style="text-align:right;color:#dc2626">${fmt(totalExp)}</td><td style="text-align:right;color:${(totalContract-totalExp)>=0?'#16a34a':'#dc2626'}">${fmt(totalContract-totalExp)}</td></tr></tfoot></table>`
    );
  };

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {PRJ_STATUSES.map(s => (
          <button key={s} onClick={() => { setStatus(s); load(s); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter===s ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Contract Value" value={fmt(totalContract)} color="text-green-600" />
        <SummaryCard label="Total Expenses"       value={fmt(totalExp)}      color="text-red-600" />
        <SummaryCard label="Gross Margin"         value={fmt(totalContract-totalExp)} color={totalContract-totalExp>=0?'text-blue-600':'text-red-600'} />
        <SummaryCard label="Gross Profit (Item Sell − Buy)" value={fmt(totalProfit)} color={totalProfit>=0?'text-orange-600':'text-red-600'} />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="px-4 py-2 border-b bg-gray-50 flex justify-end">
          <button onClick={doPrint} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 font-medium">🖨 Print</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Project','Customer','Items','Status','Contract Value','Invoiced','Gross Profit','Collected','Expenses','Margin','Warranty','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(p => {
              const margin = p.contractValue - p.totalExpenses;
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-gray-500">{p.customer?.name||'—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs max-w-xs truncate" title={p.itemsSummary}>{p.itemsSummary||'—'}</td>
                  <td className="px-4 py-2"><StatusBadge status={p.status}/></td>
                  <td className="px-4 py-2">{fmt(p.contractValue)}</td>
                  <td className="px-4 py-2">{fmt(p.totalInvoiced)}</td>
                  <td className={`px-4 py-2 font-medium ${p.grossProfit<0?'text-red-600':'text-orange-600'}`}>{fmt(p.grossProfit)}</td>
                  <td className="px-4 py-2 text-green-600">{fmt(p.totalCollected)}</td>
                  <td className="px-4 py-2 text-red-500">{fmt(p.totalExpenses)}</td>
                  <td className={`px-4 py-2 font-semibold ${margin>=0?'text-green-600':'text-red-600'}`}>{fmt(margin)}</td>
                  <td className="px-4 py-2">{p.warranty?<StatusBadge status={p.warranty.status}/>:'—'}</td>
                  <td className="px-4 py-2">
                    <button onClick={()=>openView(p.id)} className="px-3 py-1 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium">View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-gray-600">TOTAL</td>
              <td className="px-4 py-2">{fmt(data.reduce((s,p)=>s+p.contractValue,0))}</td>
              <td className="px-4 py-2">{fmt(data.reduce((s,p)=>s+p.totalInvoiced,0))}</td>
              <td className="px-4 py-2 text-orange-600">{fmt(totalProfit)}</td>
              <td className="px-4 py-2 text-green-600">{fmt(data.reduce((s,p)=>s+(p.totalCollected||0),0))}</td>
              <td className="px-4 py-2 text-red-600">{fmt(data.reduce((s,p)=>s+p.totalExpenses,0))}</td>
              <td className={`px-4 py-2 ${(totalContract-totalExp)>=0?'text-green-600':'text-red-600'}`}>{fmt(totalContract-totalExp)}</td>
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Project Detail Modal */}
      {viewed && (
        <Modal title={viewed.name} onClose={()=>setViewed(null)} wide>
          <div className="space-y-5">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <SummaryCard label="Budget (Contract)" value={fmt(viewed.contractValue)} />
              <SummaryCard label="Invoiced" value={fmt(viewed.totalInvoiced)} />
              <SummaryCard label="Collected" value={fmt(viewed.totalCollected)} color="text-green-600" />
              <SummaryCard label="Balance" value={fmt(viewed.totalInvoiced-viewed.totalCollected)} color="text-red-600" />
              <SummaryCard label="Expenses" value={fmt(viewed.totalExpenses)} color="text-red-600" />
              <SummaryCard label="Gross Profit" value={fmt(viewed.grossProfit)} color={viewed.grossProfit>=0?'text-orange-600':'text-red-600'} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Invoices</p>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>{['Code','Date','Status','Total','Paid'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewed.invoices.length===0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No invoices</td></tr>}
                  {viewed.invoices.map(inv=>{
                    const paid = inv.payments.reduce((s,p)=>s+p.amount,0);
                    return (
                      <tr key={inv.id}>
                        <td className="px-3 py-2 font-mono text-xs">INV-{String(inv.id).padStart(4,'0')}</td>
                        <td className="px-3 py-2 text-gray-500">{fmtD(inv.issueDate||inv.createdAt)}</td>
                        <td className="px-3 py-2"><StatusBadge status={inv.status}/></td>
                        <td className="px-3 py-2">{fmt(inv.total)}</td>
                        <td className="px-3 py-2 text-green-600">{fmt(paid)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expenses</p>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>{['Date','Category','Description','Amount'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewed.expenses.length===0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">No expenses</td></tr>}
                  {viewed.expenses.map(e=>(
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-gray-500">{fmtD(e.expenseDate)}</td>
                      <td className="px-3 py-2">{e.category||'—'}</td>
                      <td className="px-3 py-2 text-gray-500">{e.description||'—'}</td>
                      <td className="px-3 py-2 text-red-600">{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gross Profit Per Line</p>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>{['Item','Qty','Buy Price','Sell Price','Profit'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewed.lines.length===0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No line items sold</td></tr>}
                  {viewed.lines.map((l,i)=>(
                    <tr key={i}>
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-3 py-2">{fmtQty(l.quantity)}</td>
                      <td className="px-3 py-2">{fmt(l.unitCost)}</td>
                      <td className="px-3 py-2">{fmt(l.unitPrice)}</td>
                      <td className={`px-3 py-2 font-medium ${l.profit<0?'text-red-600':'text-orange-600'}`}>{fmt(l.profit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-50 border-t-2 border-orange-200 font-bold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-gray-700">TOTAL GROSS PROFIT</td>
                    <td className="px-3 py-2 text-orange-600">{fmt(viewed.grossProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>printProjectDetail(viewed)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium">🖨 Print</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Payroll ─────────────────────────────────────────────────────────────────
function PayrollReport() {
  const [data, setData] = useState(null);
  useEffect(() => { client.get('/reports/payroll').then(r => setData(r.data)); }, []);

  if (!data) return null;
  const grandTotal = data.reduce((s,r)=>s+r.total,0);

  const doPrint = () => {
    const sections = data.map(run => {
      const rows = run.payslips.map(p=>`<tr><td>${p.employee?.name}</td><td>${p.employee?.position||'—'}</td><td style="text-align:right">${fmt(p.basicSalary)}</td><td style="text-align:right;color:#16a34a">+${fmt(p.allowances)}</td><td style="text-align:right;color:#dc2626">-${fmt(p.deductions)}</td><td style="text-align:right;font-weight:bold">${fmt(p.netPay)}</td></tr>`).join('');
      return `<div class="section">${new Date(run.year,run.month-1).toLocaleDateString('en-US',{month:'long',year:'numeric'})} — ${fmt(run.total)}</div>
        <table><thead><tr><th>Employee</th><th>Position</th><th style="text-align:right">Basic</th><th style="text-align:right">Allowances</th><th style="text-align:right">Deductions</th><th style="text-align:right">Net Pay</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join('');
    printWindow('Payroll Report', null,
      `<div class="card" style="margin-bottom:16px"><div class="card-label">Total Payroll (All Time)</div><div class="card-value" style="color:#7c3aed">${fmt(grandTotal)}</div></div>${sections}`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SummaryCard label="Total Payroll (All Time)" value={fmt(grandTotal)} color="text-purple-600" />
        <button onClick={doPrint} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 font-medium self-start">🖨 Print</button>
      </div>
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
