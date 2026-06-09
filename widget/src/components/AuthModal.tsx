import { useSignal } from '@preact/signals';
import { useAuth } from '../hooks/useAuth';
import { globalShowAuthModal, globalAuthMode, globalAuthError, globalIsGuestReady, globalAuthReason } from '../lib/auth';

interface Props {
  apiUrl: string;
  requireLogin?: boolean;
}

export function AuthModal({ apiUrl, requireLogin }: Props) {
  const password = useSignal('');
  const submitting = useSignal(false);
  const trap = useSignal('');

  const {
    guestName,
    guestEmail,
    saveInfo,
    login,
    register,
    handleGuestSubmit
  } = useAuth(apiUrl, !!requireLogin);

  const handleModalSubmit = async (e: Event) => {
    e.preventDefault();
    globalAuthError.value = '';
    submitting.value = true;

    if (globalAuthMode.value === 'guest') {
      if (!guestName.value || !guestEmail.value) {
        submitting.value = false;
        return;
      }
      globalIsGuestReady.value = true;
      handleGuestSubmit(guestName.value, guestEmail.value);
      globalShowAuthModal.value = false;
    } else if (globalAuthMode.value === 'login') {
      if (!guestEmail.value || !password.value) {
        submitting.value = false;
        return;
      }
      const success = await login(guestEmail.value, password.value);
      if (success) {
        globalShowAuthModal.value = false;
      } else {
        globalAuthError.value = 'Invalid email or password';
      }
    } else if (globalAuthMode.value === 'register') {
      if (!guestName.value || !guestEmail.value || !password.value) {
        submitting.value = false;
        return;
      }
      const success = await register(guestEmail.value, guestName.value, password.value, trap.value);
      if (success) {
        globalShowAuthModal.value = false;
      } else {
        globalAuthError.value = 'Registration failed';
      }
    }
    submitting.value = false;
  };

  if (!globalShowAuthModal.value) return null;

  return (
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-transparent backdrop-blur-sm animate-in fade-in duration-200">
      <div class="relative w-full min-w-0 max-w-[700px] max-h-[95vh] overflow-y-auto bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col min-[480px]:flex-row animate-in zoom-in-95 duration-200">
        <button onClick={() => globalShowAuthModal.value = false} class="absolute top-4 right-4 z-10 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <div class="w-full min-[480px]:w-[45%] bg-gray-50/50 dark:bg-[#161616] p-6 min-[480px]:p-8 flex flex-col justify-center border-b min-[480px]:border-b-0 min-[480px]:border-r border-gray-100 dark:border-gray-800/60">
            <div class="mt-2 min-[480px]:mt-0">
              <h3 class="text-[20px] font-bold text-gray-900 dark:text-white leading-tight">
                {globalAuthMode.value === 'login' ? 'Welcome back 👋' : globalAuthMode.value === 'register' ? 'Create account ✨' : (globalAuthReason.value === 'like' ? 'Login required 🔒' : 'Leave a comment ✍️')}
              </h3>
              <p class="text-[14px] text-gray-500 dark:text-gray-400 mt-2.5">
                {globalAuthMode.value === 'login' ? (globalAuthReason.value === 'like' ? 'Sign in to like this comment.' : 'Sign in to leave a comment.') : globalAuthMode.value === 'register' ? 'Join our community.' : 'Fill in your details to comment as a guest.'}
              </p>
            </div>
            
            <div class="mt-8 flex flex-col gap-3 text-[14px]">
              {globalAuthMode.value !== 'login' && (
                <div class="text-gray-500 dark:text-gray-400">Already have an account? <button type="button" onClick={() => globalAuthMode.value = 'login'} class="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300">Sign in</button></div>
              )}
              {globalAuthMode.value !== 'register' && (
                <div class="text-gray-500 dark:text-gray-400">Don't have an account? <button type="button" onClick={() => globalAuthMode.value = 'register'} class="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300">Register</button></div>
              )}
              {globalAuthMode.value !== 'guest' && !requireLogin && globalAuthReason.value !== 'like' && (
                <div class="text-gray-500 dark:text-gray-400 mt-3 pt-4 border-t border-gray-200 dark:border-gray-800">Or just want to <button type="button" onClick={() => globalAuthMode.value = 'guest'} class="text-gray-900 dark:text-white font-medium hover:underline">comment as Guest</button></div>
              )}
            </div>
        </div>

        <div class="w-full min-[480px]:w-[55%] p-6 min-[480px]:p-8 min-[480px]:pt-12">
            <form onSubmit={handleModalSubmit} class="flex flex-col gap-4">
              <input type="text" name="_diskus_trap" value={trap.value} onInput={(e) => trap.value = (e.target as HTMLInputElement).value} style={{ display: 'none', position: 'absolute', opacity: 0 }} tabIndex={-1} autoComplete="off" />
              
              {globalAuthError.value && <div class="p-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-[13px] font-medium rounded-xl">{globalAuthError.value}</div>}
              
              {(globalAuthMode.value === 'guest' || globalAuthMode.value === 'register') && (
                <div class="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input type="text" placeholder="Name" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors" value={guestName.value} onInput={(e) => guestName.value = (e.target as HTMLInputElement).value} required />
                </div>
              )}
              
              <div class="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input type="email" placeholder="Email" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors" value={guestEmail.value} onInput={(e) => guestEmail.value = (e.target as HTMLInputElement).value} required />
              </div>

              {(globalAuthMode.value === 'login' || globalAuthMode.value === 'register') && (
                <div class="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input type="password" placeholder="Password" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors" value={password.value} onInput={(e) => password.value = (e.target as HTMLInputElement).value} required />
                </div>
              )}

              {globalAuthMode.value === 'guest' && (
                <label class="flex items-start gap-2 mt-1 cursor-pointer group">
                  <input type="checkbox" checked={saveInfo.value} onChange={(e) => saveInfo.value = (e.target as HTMLInputElement).checked} class="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-900 cursor-pointer transition-colors" />
                  <span class="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 select-none transition-colors">Remember me</span>
                </label>
              )}
              
              <button type="submit" disabled={submitting.value} class="w-full mt-2 py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                  {submitting.value ? 'Please wait...' : globalAuthMode.value === 'login' ? 'Login' : globalAuthMode.value === 'register' ? 'Register' : 'Continue as Guest'}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
}
