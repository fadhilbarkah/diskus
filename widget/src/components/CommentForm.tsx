import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { useAuth } from '../hooks/useAuth';
import { generateAvatarSeed } from '../lib/utils';

interface Props {
  onSubmit: (content: string, name: string, email: string, parentId?: string, trap?: string) => Promise<void>;
  parentId?: string;
  onCancel?: () => void;
  apiUrl: string;
  requireLogin?: boolean;
}

export function CommentForm({ onSubmit, parentId, onCancel, apiUrl, requireLogin }: Props) {
  const content = useSignal('');
  const password = useSignal('');
  const submitting = useSignal(false);
  const isExpanded = useSignal(!!parentId);
  const trap = useSignal('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    authMode,
    authError,
    guestName,
    guestEmail,
    saveInfo,
    widgetUser,
    login,
    register,
    logout,
    handleGuestSubmit
  } = useAuth(apiUrl, !!requireLogin);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    authError.value = '';

    const currentUser = widgetUser.peek();
    if (!currentUser) {
      if (authMode.value === 'guest') {
        if (!content.value || !guestName.value || !guestEmail.value) return;
        submitting.value = true;
        handleGuestSubmit(guestName.value, guestEmail.value);
        await onSubmit(content.value, guestName.value, guestEmail.value, parentId, trap.value);
      } else if (authMode.value === 'login') {
        if (!guestEmail.value || !password.value) return;
        submitting.value = true;
        const success = await login(guestEmail.value, password.value);
        if (success && widgetUser.peek() && content.value) {
          await onSubmit(content.value, widgetUser.peek()!.name, widgetUser.peek()!.email, parentId, trap.value);
        } else {
          submitting.value = false;
          return;
        }
      } else if (authMode.value === 'register') {
        if (!guestName.value || !guestEmail.value || !password.value) return;
        submitting.value = true;
        const success = await register(guestEmail.value, guestName.value, password.value, trap.value);
        if (success && widgetUser.peek() && content.value) {
          await onSubmit(content.value, widgetUser.peek()!.name, widgetUser.peek()!.email, parentId, trap.value);
        } else {
          submitting.value = false;
          return;
        }
      }
    } else {
      if (!content.value) return;
      submitting.value = true;
      await onSubmit(content.value, currentUser.name, currentUser.email, parentId, trap.value);
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
  const avatarSeedPreview = useSignal('guest');

  useEffect(() => {
    const rawEmail = widgetUser.value ? widgetUser.value.email : guestEmail.value;
    if (widgetUser.value?.avatarSeed) {
      avatarSeedPreview.value = widgetUser.value.avatarSeed;
    } else {
      generateAvatarSeed(rawEmail).then(seed => avatarSeedPreview.value = seed);
    }
  }, [guestEmail.value, widgetUser.value]);

  const getAvatarUrl = () => `https://api.dicebear.com/10.x/thumbs/svg?seed=${avatarSeedPreview.value}`;

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
                        <input type="text" placeholder="Name" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#222] transition-colors" value={guestName.value} onInput={(e) => guestName.value = (e.target as HTMLInputElement).value} required={isExpanded.value} />
                      </div>
                    )}
                    <div class="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      <input type="email" placeholder="Email" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#222] transition-colors" value={guestEmail.value} onInput={(e) => guestEmail.value = (e.target as HTMLInputElement).value} required={isExpanded.value} />
                    </div>
                    {authMode.value === 'guest' && (
                      <label class="flex items-start gap-2 mt-1 cursor-pointer group">
                        <input type="checkbox" checked={saveInfo.value} onChange={(e) => saveInfo.value = (e.target as HTMLInputElement).checked} class="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[#222] text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-900 cursor-pointer transition-colors" />
                        <span class="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 select-none transition-colors">Remember me</span>
                      </label>
                    )}
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
                <div class="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#181818]">
                  <div class="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-3">
                    <div class="flex items-center gap-2.5 min-w-0 shrink">
                      <span class="w-2.5 h-2.5 rounded-full bg-[#22c55e] shrink-0"></span>
                      <strong class="text-[14px] sm:text-[15px] text-[#111827] dark:text-gray-100 font-semibold truncate">{widgetUser.value.name}</strong>
                    </div>
                    
                    <div class="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                      <button type="button" onClick={logout} class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center justify-center shrink-0" title="Logout">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      </button>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 sm:gap-4 shrink-0 ml-auto">
                    {showCancel && (
                      <button type="button" onClick={handleCancel} class="text-[14px] sm:text-[15px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shrink-0">Cancel</button>
                    )}
                    <button type="submit" disabled={submitting.value} class="px-5 py-2.5 ml-1 bg-blue-600 text-white text-[14px] sm:text-[15px] font-medium rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0">
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
