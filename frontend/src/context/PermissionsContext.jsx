import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setPermissions({}); setLoading(false); return; }
    if (user.role === 'ADMIN') { setPermissions('admin'); setLoading(false); return; }
    try {
      const { data } = await client.get(`/permissions/user/${user.id}`);
      setPermissions(data);
    } catch {
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const can = useCallback((module, action = 'canView') => {
    if (!user) return false;
    if (user.role === 'ADMIN' || permissions === 'admin') return true;
    return !!permissions[module]?.[action];
  }, [user, permissions]);

  const canView = useCallback(module => can(module, 'canView'), [can]);

  return (
    <Ctx.Provider value={{ permissions, loading, can, canView, reload: load }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePermissions = () => useContext(Ctx);
