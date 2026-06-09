import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { useAuth } from '../hooks/useAuth';
import { generateAvatarSeed } from '../lib/utils';
import { globalIsGuestReady, globalShowAuthModal, globalAuthMode, globalAuthReason } from '../lib/auth';

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
    // This is now handled globally, but we keep it here just in case or remove it.
    // Actually, we can remove handleModalSubmit entirely from CommentForm since it is in AuthModal!
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
                        <button type="button" onClick={() => { globalIsGuestReady.value = false; globalAuthReason.value = 'comment'; globalShowAuthModal.value = true; globalAuthMode.value = 'guest'; }} class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center justify-center shrink-0 text-[13px] font-medium" title="Edit Guest Info">
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
               <button type="button" onClick={() => { globalAuthReason.value = 'comment'; globalShowAuthModal.value = true; }} class="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 text-white text-[13px] sm:text-[14px] font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm">
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
    </div>
  );
}

