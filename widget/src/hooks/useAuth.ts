import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { widgetToken, widgetUser, setWidgetAuth, logoutWidget } from '../lib/auth';

export function useAuth(apiUrl: string, requireLogin: boolean) {
  const getStored = (key: string) => {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  };
  const setStored = (key: string, val: string) => {
    try { localStorage.setItem(key, val); } catch {}
  };

  const authMode = useSignal<'guest' | 'login' | 'register'>(requireLogin ? 'login' : 'guest');
  const authError = useSignal('');
  
  const guestName = useSignal(getStored('diskus_guest_name'));
  const guestEmail = useSignal(getStored('diskus_guest_email'));
  const saveInfo = useSignal(true);

  useEffect(() => {
    if (requireLogin && authMode.value === 'guest') {
      authMode.value = 'login';
    }
  }, [requireLogin]);

  const login = async (email: string, password: string): Promise<boolean> => {
    authError.value = '';
    try {
      const res = await fetch(`${apiUrl}/widget/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWidgetAuth(data.token, data.user);
      return true;
    } catch (err: any) {
      authError.value = err.message;
      return false;
    }
  };

  const register = async (email: string, name: string, password: string, trap: string): Promise<boolean> => {
    authError.value = '';
    try {
      const res = await fetch(`${apiUrl}/widget/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, _diskus_trap: trap })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWidgetAuth(data.token, data.user);
      return true;
    } catch (err: any) {
      authError.value = err.message;
      return false;
    }
  };

  const handleGuestSubmit = (name: string, email: string) => {
    if (saveInfo.value) {
      setStored('diskus_guest_name', name);
      setStored('diskus_guest_email', email);
    } else {
      try { localStorage.removeItem('diskus_guest_name'); localStorage.removeItem('diskus_guest_email'); } catch {}
    }
  };

  return {
    authMode,
    authError,
    guestName,
    guestEmail,
    saveInfo,
    widgetUser,
    widgetToken,
    login,
    register,
    logout: logoutWidget,
    handleGuestSubmit
  };
}
