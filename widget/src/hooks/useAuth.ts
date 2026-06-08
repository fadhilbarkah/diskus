import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { widgetToken, widgetUser, setWidgetAuth, logoutWidget, globalGuestName, globalGuestEmail, setGuestAuth, clearGuestAuth, globalIsGuestReady } from '../lib/auth';

export function useAuth(apiUrl: string, requireLogin: boolean) {
  const authMode = useSignal<'guest' | 'login' | 'register'>(requireLogin ? 'login' : 'guest');
  const authError = useSignal('');
  
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
      setGuestAuth(name, email);
    } else {
      clearGuestAuth();
      // Even if we don't save to localStorage, we keep it in memory for this session
      globalGuestName.value = name;
      globalGuestEmail.value = email;
      globalIsGuestReady.value = true;
    }
  };

  return {
    authMode,
    authError,
    guestName: globalGuestName,
    guestEmail: globalGuestEmail,
    saveInfo,
    widgetUser,
    widgetToken,
    login,
    register,
    logout: logoutWidget,
    handleGuestSubmit
  };
}
