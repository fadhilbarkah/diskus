import { useSignal } from '@preact/signals';
import { api } from '../lib/api';
import { setAuth } from '../lib/auth';
import { Mail, Lock, LogIn } from 'lucide-preact';

export function Login() {
  const email = useSignal('');
  const password = useSignal('');
  const rememberMe = useSignal(false);
  const loading = useSignal(false);
  const error = useSignal('');

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    loading.value = true;
    error.value = '';
    
    try {
      const data = await api.login(email.value, password.value);
      setAuth(data.token, data.user);
      // authState.isLoggedIn becomes true -> App re-renders to Dashboard
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return (
    <div class="min-h-screen bg-gray-50/50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div class="sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div class="bg-white py-12 px-8 border border-gray-100 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          
          <div class="flex flex-col items-center mb-10">
            <div class="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center mb-5">
              <span class="text-2xl font-bold text-blue-600">D</span>
            </div>
            <h2 class="text-center text-3xl font-extrabold text-gray-900 tracking-tight">Diskus</h2>
            <p class="mt-2 text-center text-[15px] text-gray-500">
              Welcome back! Sign in to continue
            </p>
          </div>

          <form class="space-y-6" onSubmit={handleLogin}>
            {error.value && (
              <div class="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 text-center font-medium">
                {error.value}
              </div>
            )}
            
            <div class="space-y-1.5">
              <label for="email" class="block text-xs font-bold text-gray-500 tracking-wider uppercase">Email address</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail class="h-5 w-5 text-gray-400" strokeWidth={2} />
                </div>
                <input 
                  id="email" 
                  type="email" 
                  required 
                  class="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all sm:text-sm font-medium"
                  placeholder="name@example.com"
                  value={email.value} 
                  onInput={(e) => email.value = (e.target as HTMLInputElement).value} 
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label for="password" class="block text-xs font-bold text-gray-500 tracking-wider uppercase">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock class="h-5 w-5 text-gray-400" strokeWidth={2} />
                </div>
                <input 
                  id="password" 
                  type="password" 
                  required 
                  class="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all sm:text-sm font-medium"
                  placeholder="••••••••"
                  value={password.value} 
                  onInput={(e) => password.value = (e.target as HTMLInputElement).value} 
                />
              </div>
            </div>

            <div class="flex items-center pt-2">
              <label class="flex items-center gap-3 cursor-pointer group">
                <div class="relative flex items-center justify-center w-5 h-5">
                  <input 
                    type="checkbox" 
                    class="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer"
                    checked={rememberMe.value}
                    onChange={(e) => rememberMe.value = (e.target as HTMLInputElement).checked}
                  />
                  <svg class="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                    <path d="M3 8L6 11L11 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"/>
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
              </label>
            </div>

            <div class="pt-2">
              <button 
                type="submit" 
                disabled={loading.value} 
                class="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading.value ? (
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn class="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
