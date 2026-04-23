import { useEffect, useState } from 'react';
import client from '../api/client';
import { usePermissions } from '../context/PermissionsContext';

const ACTIONS = [
  { key: 'canView',    label: 'View'    },
  { key: 'canCreate',  label: 'Create'  },
  { key: 'canEdit',    label: 'Edit'    },
  { key: 'canDelete',  label: 'Delete'  },
  { key: 'canSpecial', label: 'Special*'},
];

const emptyPerm = () => ({ canView:false, canCreate:false, canEdit:false, canDelete:false, canSpecial:false });

const roleColors = {
  CEO:                  'bg-purple-100 text-purple-700',
  FINANCE_MANAGER:      'bg-blue-100 text-blue-700',
  ENGINEERING_MANAGER:  'bg-indigo-100 text-indigo-700',
  PROJECT_COORDINATOR:  'bg-cyan-100 text-cyan-700',
  ACCOUNTANT:           'bg-teal-100 text-teal-700',
  TECHNICIAN:           'bg-green-100 text-green-700',
};

export default function Permissions() {
  const { reload } = usePermissions();
  const [modules, setModules]         = useState([]);
  const [specialLabels, setSpecials]  = useState({});
  const [users, setUsers]             = useState([]);
  const [activeUser, setActiveUser]   = useState(null);
  const [perms, setPerms]             = useState({});
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    client.get('/permissions/modules').then(r => { setModules(r.data.modules); setSpecials(r.data.specialLabels); });
    client.get('/permissions/users').then(r => setUsers(r.data));
  }, []);

  useEffect(() => {
    if (!activeUser || !modules.length) return;
    setLoading(true);
    client.get(`/permissions/user/${activeUser.id}`)
      .then(r => {
        const filled = {};
        modules.forEach(m => { filled[m.id] = r.data[m.id] || emptyPerm(); });
        setPerms(filled);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load permissions'))
      .finally(() => setLoading(false));
  }, [activeUser, modules]);

  const toggle = (module, action) => {
    setPerms(prev => {
      const updated = { ...prev[module], [action]: !prev[module][action] };
      if (action === 'canView' && !updated.canView)
        updated.canCreate = updated.canEdit = updated.canDelete = updated.canSpecial = false;
      if (action !== 'canView' && updated[action]) updated.canView = true;
      return { ...prev, [module]: updated };
    });
  };

  const toggleRow = module => {
    const allOn = ACTIONS.every(a => perms[module]?.[a.key]);
    setPerms(prev => ({ ...prev, [module]: allOn ? emptyPerm() : { canView:true, canCreate:true, canEdit:true, canDelete:true, canSpecial:true } }));
  };

  const toggleGroup = (groupIds, enable) => {
    setPerms(prev => {
      const next = { ...prev };
      groupIds.forEach(id => { next[id] = enable ? { canView:true, canCreate:true, canEdit:true, canDelete:true, canSpecial:true } : emptyPerm(); });
      return next;
    });
  };

  const save = async () => {
    if (!activeUser) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      await client.put(`/permissions/user/${activeUser.id}`, { permissions: perms });
      setSaved(true);
      reload();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const groups = modules.reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = [];
    acc[m.group].push(m);
    return acc;
  }, {});

  return (
    <div className="flex gap-5 min-h-0">
      {/* User list */}
      <div className="w-56 shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Users</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select to configure</p>
          </div>
          <div className="divide-y divide-gray-50">
            {users.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">No users found</div>}
            {users.map(u => (
              <button key={u.id} onClick={() => { setActiveUser(u); setSaved(false); setError(''); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${activeUser?.id === u.id ? 'bg-orange-50' : ''}`}>
                <div className="min-w-0">
                  <div className={`text-sm font-medium truncate ${activeUser?.id === u.id ? 'text-orange-700' : 'text-gray-800'}`}>{u.name}</div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[u.role] || 'bg-gray-100 text-gray-500'}`}>{u.role?.replace(/_/g,' ')}</span>
                </div>
                {activeUser?.id === u.id && <span className="text-orange-500 text-xs">›</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Permission matrix */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeUser ? `${activeUser.name}'s Permissions` : 'User Permissions'}
            </h1>
            <p className="text-sm text-gray-500">
              {activeUser ? `${activeUser.email} · ${activeUser.role?.replace(/_/g,' ')}` : 'Select a user from the left to configure access'}
            </p>
          </div>
          {activeUser && (
            <button onClick={save} disabled={saving || loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Permissions'}
            </button>
          )}
        </div>

        {/* Admin note */}
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <span className="text-amber-500 text-lg leading-none">🛡</span>
          <p><strong>Admin accounts</strong> always have full access and are not shown here. Permissions are set per individual user — changes only affect the selected user.</p>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

        {!activeUser ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-3">🔐</div>
            <p className="text-gray-400 text-sm">Select a user on the left to view and edit their permissions</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 items-center px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div className="col-span-4 text-xs font-bold uppercase tracking-wider text-gray-500">Module</div>
              {ACTIONS.map(a => (
                <div key={a.key} className="col-span-1 text-center text-xs font-bold uppercase tracking-wider text-gray-500">{a.label}</div>
              ))}
              <div className="col-span-2 text-center text-xs font-bold uppercase tracking-wider text-gray-500">All</div>
            </div>

            {Object.entries(groups).map(([group, mods]) => {
              const groupIds = mods.map(m => m.id);
              const allGroupOn = groupIds.every(id => perms[id] && ACTIONS.every(a => perms[id][a.key]));
              return (
                <div key={group}>
                  <div className="flex items-center justify-between px-5 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{group}</span>
                    <button onClick={() => toggleGroup(groupIds, !allGroupOn)}
                      className={`text-xs px-3 py-0.5 rounded-full font-medium ${allGroupOn ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}>
                      {allGroupOn ? 'Revoke All' : 'Grant All'}
                    </button>
                  </div>
                  {mods.map(mod => {
                    const p = perms[mod.id] || emptyPerm();
                    const allOn = ACTIONS.every(a => p[a.key]);
                    const anyOn = ACTIONS.some(a => p[a.key]);
                    const specialLabel = specialLabels[mod.id];
                    return (
                      <div key={mod.id} className="grid grid-cols-12 gap-2 items-center px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className="col-span-4 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${anyOn ? 'bg-green-400' : 'bg-gray-300'}`} />
                          <span className={`text-sm font-medium ${anyOn ? 'text-gray-800' : 'text-gray-400'}`}>{mod.label}</span>
                        </div>
                        {ACTIONS.map(action => {
                          const isSpecial  = action.key === 'canSpecial';
                          const hasSpecial = !!specialLabel;
                          const disabled   = isSpecial && !hasSpecial;
                          return (
                            <div key={action.key} className="col-span-1 flex justify-center">
                              <button type="button" disabled={disabled}
                                onClick={() => !disabled && toggle(mod.id, action.key)}
                                title={isSpecial && specialLabel ? specialLabel : action.label}
                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${disabled ? 'opacity-25 cursor-not-allowed border-gray-200 bg-white' :
                                  p[action.key]
                                    ? action.key === 'canDelete'  ? 'bg-red-500 border-red-500'
                                    : action.key === 'canSpecial' ? 'bg-purple-500 border-purple-500'
                                    : 'bg-orange-500 border-orange-500'
                                    : 'bg-white border-gray-300 hover:border-gray-400'}`}>
                                {p[action.key] && !disabled && (
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>
                            </div>
                          );
                        })}
                        <div className="col-span-2 flex justify-center">
                          <button onClick={() => toggleRow(mod.id)}
                            className={`px-3 py-0.5 rounded-full text-xs font-semibold ${allOn ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {allOn ? 'Revoke' : 'Grant'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Legend */}
            <div className="px-5 py-3 bg-gray-50 border-t flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="font-semibold">Special* actions:</span>
              {Object.entries(specialLabels).map(([modId, label]) => {
                const m = modules.find(x => x.id === modId);
                return m ? <span key={modId}><strong>{m.label}:</strong> {label}</span> : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
