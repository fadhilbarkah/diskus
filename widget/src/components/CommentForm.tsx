import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { useAuth } from '../hooks/useAuth';
import { generateAvatarSeed } from '../lib/utils';
import { globalIsGuestReady } from '../lib/auth';

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
  
  const showAuthModal = useSignal(false);

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
    
    if (!currentUser && globalIsGuestReady.peek() && !requireLogin) {
      if (!content.value) return;
      submitting.value = true;
      handleGuestSubmit(guestName.value, guestEmail.value);
      await onSubmit(content.value, guestName.value, guestEmail.value, parentId, trap.value);
    } else if (currentUser) {
      if (!content.value) return;
      submitting.value = true;
      await onSubmit(content.value, currentUser.name, currentUser.email, parentId, trap.value);
    }
    
    content.value = '';
    submitting.value = false;
    isExpanded.value = false;
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (onCancel) onCancel();
  };

  const handleModalSubmit = async (e: Event) => {
    e.preventDefault();
    authError.value = '';
    submitting.value = true;

    if (authMode.value === 'guest') {
      if (!guestName.value || !guestEmail.value) {
        submitting.value = false;
        return;
      }
      globalIsGuestReady.value = true;
      handleGuestSubmit(guestName.value, guestEmail.value);
      showAuthModal.value = false;
      // Also expand the textarea so they can type immediately
      isExpanded.value = true;
    } else if (authMode.value === 'login') {
      if (!guestEmail.value || !password.value) {
        submitting.value = false;
        return;
      }
      const success = await login(guestEmail.value, password.value);
      if (success) {
        showAuthModal.value = false;
        isExpanded.value = true;
      }
    } else if (authMode.value === 'register') {
      if (!guestName.value || !guestEmail.value || !password.value) {
        submitting.value = false;
        return;
      }
      const success = await register(guestEmail.value, guestName.value, password.value, trap.value);
      if (success) {
        showAuthModal.value = false;
        isExpanded.value = true;
      }
    }
    submitting.value = false;
  };

  const handleCancel = () => {
    content.value = '';
    isExpanded.value = false;
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

  const canComment = !!widgetUser.value || (globalIsGuestReady.value && !requireLogin);

  return (
    <div class={`w-full ${parentId ? 'mt-4' : ''}`}>
      {canComment ? (
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
                required
                style={{ minHeight: isExpanded.value ? '80px' : '28px' }}
              />
            </div>
            
            <div class={`grid transition-all duration-300 ease-in-out ${isExpanded.value ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div class="overflow-hidden">
                <div class="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#181818]">
                  <div class="flex items-center justify-between min-[480px]:justify-start gap-3 min-[480px]:gap-4 flex-1 min-w-0 px-4 min-[480px]:px-5 py-3">
                    <div class="flex items-center gap-2.5 min-w-0 shrink">
                      <span class={`w-2.5 h-2.5 rounded-full shrink-0 ${widgetUser.value ? 'bg-[#22c55e]' : 'bg-gray-400 dark:bg-gray-500'}`}></span>
                      <strong class="text-[14px] min-[480px]:text-[15px] text-[#111827] dark:text-gray-100 font-semibold truncate">
                        {widgetUser.value ? widgetUser.value.name : `${guestName.value} (Guest)`}
                      </strong>
                    </div>
                    
                    <div class="flex items-center gap-3 min-[480px]:gap-4 shrink-0">
                      <div class="hidden min-[480px]:block w-px h-5 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                      {widgetUser.value ? (
                        <button type="button" onClick={logout} class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center justify-center shrink-0" title="Logout">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </button>
                      ) : (
                        <button type="button" onClick={() => { globalIsGuestReady.value = false; showAuthModal.value = true; authMode.value = 'guest'; }} class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center justify-center shrink-0 text-[13px] font-medium" title="Edit Guest Info">
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                  <div class="flex items-center justify-end min-[480px]:justify-end gap-3 min-[480px]:gap-4 shrink-0 w-full min-[480px]:w-auto px-4 min-[480px]:px-5 py-3 min-[480px]:py-3 border-t border-gray-100 dark:border-gray-800 min-[480px]:border-t-0">
                    {showCancel && (
                      <button type="button" onClick={handleCancel} class="text-[14px] min-[480px]:text-[15px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shrink-0 mr-auto min-[480px]:mr-0">Cancel</button>
                    )}
                    <button type="submit" disabled={submitting.value} class="px-5 py-2.5 ml-1 bg-blue-600 text-white text-[14px] min-[480px]:text-[15px] font-medium rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0">
                      {submitting.value ? 'Sending...' : (parentId ? 'Reply' : 'Comment')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div class="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-[#151515] p-4 sm:p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
             <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                  <img src={getAvatarUrl()} alt="Avatar" class="w-full h-full object-cover opacity-90 dark:opacity-80" />
                </div>
                <div class="min-w-0">
                  <h4 class="text-[14px] sm:text-[16px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">Join the conversation</h4>
                  <p class="text-[12px] sm:text-[14px] text-gray-500 dark:text-gray-400 mt-0.5 truncate hidden sm:block">Write a comment and connect with others.</p>
                  <p class="text-[12px] sm:text-[14px] text-gray-500 dark:text-gray-400 mt-0.5 truncate sm:hidden">Write a comment.</p>
                </div>
             </div>
             <div class="flex items-center gap-2 shrink-0">
               {onCancel && <button type="button" onClick={onCancel} class="px-3 py-2 text-[13px] sm:text-[14px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>}
               <button type="button" onClick={() => showAuthModal.value = true} class="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 text-white text-[13px] sm:text-[14px] font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                 Sign In
               </button>
             </div>
          </div>
          <div class="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 text-[12px] sm:text-[13px] text-gray-400 dark:text-gray-500">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
             <span>{requireLogin ? 'Only signed-in users can comment' : 'Sign in or use a guest account to comment'}</span>
          </div>
        </div>
      )}

      {showAuthModal.value && (
         <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-transparent backdrop-blur-sm animate-in fade-in duration-200">
           <div class="relative w-full max-w-[700px] bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col min-[480px]:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
              <button onClick={() => showAuthModal.value = false} class="absolute top-4 right-4 z-10 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              
              <div class="w-full min-[480px]:w-[45%] bg-gray-50/50 dark:bg-[#161616] p-6 min-[480px]:p-8 flex flex-col justify-center border-b min-[480px]:border-b-0 min-[480px]:border-r border-gray-100 dark:border-gray-800/60">
                 <div class="mt-2 min-[480px]:mt-0">
                   <h3 class="text-[20px] font-bold text-gray-900 dark:text-white leading-tight">
                      {authMode.value === 'login' ? 'Welcome back 👋' : authMode.value === 'register' ? 'Create account ✨' : 'Leave a comment ✍️'}
                   </h3>
                   <p class="text-[14px] text-gray-500 dark:text-gray-400 mt-2.5">
                      {authMode.value === 'login' ? 'Sign in to leave a comment.' : authMode.value === 'register' ? 'Join our community.' : 'Fill in your details to comment as a guest.'}
                   </p>
                 </div>
                 
                 <div class="mt-8 flex flex-col gap-3 text-[14px]">
                    {authMode.value !== 'login' && (
                      <div class="text-gray-500 dark:text-gray-400">Already have an account? <button type="button" onClick={() => authMode.value = 'login'} class="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300">Sign in</button></div>
                    )}
                    {authMode.value !== 'register' && (
                      <div class="text-gray-500 dark:text-gray-400">Don't have an account? <button type="button" onClick={() => authMode.value = 'register'} class="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300">Register</button></div>
                    )}
                    {authMode.value !== 'guest' && !requireLogin && (
                      <div class="text-gray-500 dark:text-gray-400 mt-3 pt-4 border-t border-gray-200 dark:border-gray-800">Or just want to <button type="button" onClick={() => authMode.value = 'guest'} class="text-gray-900 dark:text-white font-medium hover:underline">comment as Guest</button></div>
                    )}
                 </div>
              </div>

              <div class="w-full min-[480px]:w-[55%] p-6 min-[480px]:p-8 min-[480px]:pt-12">
                 <form onSubmit={handleModalSubmit} class="flex flex-col gap-4">
                    <input type="text" name="_diskus_trap" value={trap.value} onInput={(e) => trap.value = (e.target as HTMLInputElement).value} style={{ display: 'none', position: 'absolute', opacity: 0 }} tabIndex={-1} autoComplete="off" />
                    
                    {authError.value && <div class="p-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-[13px] font-medium rounded-xl">{authError.value}</div>}
                    
                    {(authMode.value === 'guest' || authMode.value === 'register') && (
                      <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <input type="text" placeholder="Name" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors" value={guestName.value} onInput={(e) => guestName.value = (e.target as HTMLInputElement).value} required />
                      </div>
                    )}
                    
                    <div class="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      <input type="email" placeholder="Email" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors" value={guestEmail.value} onInput={(e) => guestEmail.value = (e.target as HTMLInputElement).value} required />
                    </div>

                    {(authMode.value === 'login' || authMode.value === 'register') && (
                      <div class="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <input type="password" placeholder="Password" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors" value={password.value} onInput={(e) => password.value = (e.target as HTMLInputElement).value} required />
                      </div>
                    )}

                    {authMode.value === 'guest' && (
                      <label class="flex items-start gap-2 mt-1 cursor-pointer group">
                        <input type="checkbox" checked={saveInfo.value} onChange={(e) => saveInfo.value = (e.target as HTMLInputElement).checked} class="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-900 cursor-pointer transition-colors" />
                        <span class="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 select-none transition-colors">Remember me</span>
                      </label>
                    )}
                    
                    <button type="submit" disabled={submitting.value} class="w-full mt-2 py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                       {submitting.value ? 'Please wait...' : authMode.value === 'login' ? 'Login' : authMode.value === 'register' ? 'Register' : 'Continue as Guest'}
                    </button>
                 </form>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}

