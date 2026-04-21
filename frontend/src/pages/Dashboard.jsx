import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

const COLORS = ['#f97316','#fb923c','#fdba74','#22c55e','#3b82f6','#8b5cf6','#ef4444','#6b7280'];

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { client.get('/dashboard').then(r => setData(r.data)); }, []);

  if (!data) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>;

  const { stats, leadsByStatus, projectsByStatus, lowStockMaterials, warrantyExpiringSoon, recentLeads, recentProjects } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats.totalLeads} icon="🎯" color="text-orange-600" />
        <StatCard label="Active Projects" value={stats.activeProjects} icon="⚡" color="text-blue-600" />
        <StatCard label="Customers" value={stats.totalCustomers} icon="👤" color="text-green-600" />
        <StatCard label="Total Revenue" value={`$ ${stats.totalRevenue?.toLocaleString()}`} icon="💰" color="text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Leads by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leadsByStatus.map(d => ({ name: d.status.replace(/_/g,' '), count: d._count }))}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Projects by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={projectsByStatus.map(d => ({ name: d.status, value: d._count }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {projectsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lowStockMaterials.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-semibold text-red-700 mb-3">⚠️ Low Stock Materials</h3>
            {lowStockMaterials.map(m => (
              <div key={m.id} className="flex justify-between text-sm py-1 border-b border-red-100 last:border-0">
                <span>{m.name}</span>
                <span className="font-medium text-red-600">{m.quantity} {m.unit} left</span>
              </div>
            ))}
          </div>
        )}
        {warrantyExpiringSoon.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-semibold text-amber-700 mb-3">🛡️ Warranties Expiring Soon</h3>
            {warrantyExpiringSoon.map(w => (
              <div key={w.id} className="flex justify-between text-sm py-1 border-b border-amber-100 last:border-0">
                <span>{w.project?.name}</span>
                <span className="font-medium text-amber-600">{new Date(w.endDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">Recent Leads</h3>
            <Link to="/leads" className="text-sm text-orange-600 hover:underline">View all</Link>
          </div>
          {recentLeads.map(l => (
            <div key={l.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-medium">{l.title}</div>
                <div className="text-xs text-gray-400">{l.customer?.name}</div>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">Recent Projects</h3>
            <Link to="/projects" className="text-sm text-orange-600 hover:underline">View all</Link>
          </div>
          {recentProjects.map(p => (
            <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-gray-400">{p.customer?.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">{p.progressPct}%</div>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
