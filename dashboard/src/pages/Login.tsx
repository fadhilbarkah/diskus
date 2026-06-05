import { useSignal } from '@preact/signals';
import { api } from '../lib/api';
import { setAuth } from '../lib/auth';
import { MessageSquare } from 'lucide-preact';

export function Login() {
  const email = useSignal('');
  const password = useSignal('');
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
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div class="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div class="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center mb-4">
          <MessageSquare class="w-6 h-6 text-white" />
        </div>
        <h2 class="text-center text-2xl font-bold text-gray-900">Sign in to Diskus</h2>
        <p class="mt-2 text-center text-sm text-gray-500">
          Enter your details below to continue
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 border border-gray-200 sm:rounded-xl sm:px-10 shadow-sm">
          <form class="space-y-6" onSubmit={handleLogin}>
            {error.value && (
              <div class="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                {error.value}
              </div>
            )}
            
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
              <div class="mt-1">
                <input id="email" type="email" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                  value={email.value} onInput={(e) => email.value = (e.target as HTMLInputElement).value} />
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
              <div class="mt-1">
                <input id="password" type="password" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                  value={password.value} onInput={(e) => password.value = (e.target as HTMLInputElement).value} />
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading.value} class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 transition-colors">
                {loading.value ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
