import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';

import { widgetToken, widgetUser, setWidgetAuth, logoutWidget } from '../lib/auth';

interface Props {
  onSubmit: (content: string, name: string, email: string, parentId?: string, trap?: string) => Promise<void>;
  parentId?: string;
  onCancel?: () => void;
  apiUrl: string;
  requireLogin?: boolean;
}

export function CommentForm({ onSubmit, parentId, onCancel, apiUrl, requireLogin }: Props) {
  const getStored = (key: string) => {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  };
  const setStored = (key: string, val: string) => {
    try { localStorage.setItem(key, val); } catch {}
  };

  const content = useSignal('');
  const name = useSignal(getStored('diskus_guest_name'));
  const email = useSignal(getStored('diskus_guest_email'));
  const password = useSignal('');
  const submitting = useSignal(false);
  const isExpanded = useSignal(!!parentId);
  const trap = useSignal('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const authMode = useSignal<'guest' | 'login' | 'register'>(requireLogin ? 'login' : 'guest');
  const authError = useSignal('');

  // Update authMode if requireLogin changes (from API fetch)
  useEffect(() => {
    if (requireLogin && authMode.value === 'guest') {
      authMode.value = 'login';
    }
  }, [requireLogin]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    authError.value = '';

    if (!widgetUser.value) {
      if (authMode.value === 'guest') {
        if (!content.value || !name.value || !email.value) return;
        submitting.value = true;
        setStored('diskus_guest_name', name.value);
        setStored('diskus_guest_email', email.value);
        await onSubmit(content.value, name.value, email.value, parentId, trap.value);
      } else if (authMode.value === 'login') {
        if (!email.value || !password.value) return;
        submitting.value = true;
        try {
          const res = await fetch(`${apiUrl}/widget/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value, password: password.value })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setWidgetAuth(data.token, data.user);
          if (content.value) {
            await onSubmit(content.value, data.user.name, data.user.email, parentId, trap.value);
          }
        } catch (err: any) {
          authError.value = err.message;
          submitting.value = false;
          return;
        }
      } else if (authMode.value === 'register') {
        if (!name.value || !email.value || !password.value) return;
        submitting.value = true;
        try {
          const res = await fetch(`${apiUrl}/widget/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value, name: name.value, password: password.value, _diskus_trap: trap.value })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setWidgetAuth(data.token, data.user);
          if (content.value) {
            await onSubmit(content.value, data.user.name, data.user.email, parentId, trap.value);
          }
        } catch (err: any) {
          authError.value = err.message;
          submitting.value = false;
          return;
        }
      }
    } else {
      if (!content.value) return;
      submitting.value = true;
      await onSubmit(content.value, widgetUser.value.name, widgetUser.value.email, parentId, trap.value);
    }
    
    content.value = '';
    password.value = '';
    submitting.value = false;
    isExpanded.value = false;
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (onCancel) onCancel();
  };

  const handleCancel = () => {
    content.value = '';
    password.value = '';
    isExpanded.value = false;
    authError.value = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (onCancel) onCancel();
  };

  const showCancel = !!onCancel || (!parentId && isExpanded.value);

  const getAvatarUrl = () => {
    if (widgetUser.value) {
      return `https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(widgetUser.value.email.toLowerCase())}`;
    }
    if (email.value) {
      return `https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(email.value.toLowerCase())}`;
    }
    return `https://api.dicebear.com/10.x/thumbs/svg?seed=guest`;
  };

  return (
    <div class={`w-full ${parentId ? 'mt-4' : ''}`}>
      <form onSubmit={handleSubmit} class="w-full">
        <input type="text" name="_diskus_trap" value={trap.value} onInput={(e) => trap.value = (e.target as HTMLInputElement).value} style={{ display: 'none', position: 'absolute', opacity: 0 }} tabIndex={-1} autoComplete="off" />
        <div class="border border-gray-200 dark:border-gray-700 overflow-hidden focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all duration-300 ease-in-out bg-white dark:bg-[#181818] rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <div class="flex gap-3.5 px-4 pt-4 pb-3 items-start">
            <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700 mt-0.5">
               <img src={getAvatarUrl()} alt="Avatar" class="w-full h-full object-cover opacity-90 dark:opacity-80" />
            </div>
            <textarea
              ref={textareaRef}
              class="flex-1 py-1.5 px-0 text-[14px] text-gray-900 dark:text-gray-100 resize-none outline-none placeholder-gray-400 dark:placeholder-gray-500 bg-transparent transition-all duration-300 ease-in-out"
              placeholder="Write a comment..."
              value={content.value}
              onFocus={() => isExpanded.value = true}
              onInput={(e) => {
                content.value = (e.target as HTMLTextAreaElement).value;
                (e.target as HTMLTextAreaElement).style.height = 'auto';
                (e.target as HTMLTextAreaElement).style.height = (e.target as HTMLTextAreaElement).scrollHeight + 'px';
              }}
              required={!!widgetUser.value || authMode.value === 'guest'}
              style={{ minHeight: isExpanded.value ? '80px' : '28px' }}
            />
          </div>
          
          <div class={`grid transition-all duration-300 ease-in-out ${isExpanded.value ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div class="overflow-hidden">
              {!widgetUser.value ? (
                <div class="flex flex-col bg-white dark:bg-[#181818]">
                  <div class="flex gap-6 px-5 border-b border-gray-100 dark:border-gray-800 mt-2">
                    {!requireLogin && <button type="button" onClick={() => authMode.value = 'guest'} class={`pb-3 text-[14px] font-medium border-b-2 transition-colors ${authMode.value === 'guest' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>Guest</button>}
                    <button type="button" onClick={() => authMode.value = 'login'} class={`pb-3 text-[14px] font-medium border-b-2 transition-colors ${authMode.value === 'login' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>Sign In</button>
                    <button type="button" onClick={() => authMode.value = 'register'} class={`pb-3 text-[14px] font-medium border-b-2 transition-colors ${authMode.value === 'register' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>Register</button>
                  </div>

                  <div class="p-5 flex flex-col gap-3">
                    {authError.value && <div class="text-red-500 text-sm font-medium">{authError.value}</div>}

                    {(authMode.value === 'guest' || authMode.value === 'register') && (
                      <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <input type="text" placeholder="Name" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#222] transition-colors" value={name.value} onInput={(e) => name.value = (e.target as HTMLInputElement).value} required={isExpanded.value} />
                      </div>
                    )}
                    <div class="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      <input type="email" placeholder="Email" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#222] transition-colors" value={email.value} onInput={(e) => email.value = (e.target as HTMLInputElement).value} required={isExpanded.value} />
                    </div>
                    {(authMode.value === 'login' || authMode.value === 'register') && (
                      <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <input type="password" placeholder="Password" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#222] transition-colors" value={password.value} onInput={(e) => password.value = (e.target as HTMLInputElement).value} required={isExpanded.value} />
                      </div>
                    )}

                    <div class="flex justify-end items-center gap-3 mt-2">
                      {showCancel && <button type="button" onClick={handleCancel} class="text-[14px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">Cancel</button>}
                      <button type="submit" disabled={submitting.value} class="px-4 py-2 bg-blue-600 text-white text-[14px] font-medium rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {submitting.value ? 'Sending...' : (authMode.value === 'login' ? 'Login' : authMode.value === 'register' ? 'Register' : (parentId ? 'Reply' : 'Comment'))}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div class="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#181818]">
                  <div class="text-[13px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-[#22c55e]"></span>
                    <span>Logged in as <strong class="text-gray-900 dark:text-gray-100 font-semibold">{widgetUser.value.name}</strong></span>
                    <span class="text-gray-300 dark:text-gray-700">|</span>
                    <button type="button" onClick={logoutWidget} class="text-[#ff4b4b] hover:text-red-600 transition-colors">Logout</button>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    {showCancel && <button type="button" onClick={handleCancel} class="text-[14px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">Cancel</button>}
                    <button type="submit" disabled={submitting.value} class="px-4 py-2 bg-blue-600 text-white text-[14px] font-medium rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                      {submitting.value ? 'Sending...' : (parentId ? 'Reply' : 'Comment')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
