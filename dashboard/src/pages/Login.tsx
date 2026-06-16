import { useSignal } from "@preact/signals";
import { Lock, LogIn, Mail } from "lucide-preact";
import { useEffect } from "preact/hooks";
import { api } from "../lib/api";
import { setAuth } from "../lib/auth";

export function Login() {
  const email = useSignal("");
  const password = useSignal("");
  const rememberMe = useSignal(false);
  const loading = useSignal(false);
  const error = useSignal("");
  const isRegistering = useSignal(false);
  const setupRequired = useSignal<boolean | null>(null);

  useEffect(() => {
    api
      .getSetupStatus()
      .then((res) => {
        setupRequired.value = res.setupRequired;
        if (res.setupRequired) isRegistering.value = true;
      })
      .catch(() => {
        setupRequired.value = false;
      });
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    loading.value = true;
    error.value = "";

    try {
      const data = isRegistering.value
        ? await api.register(email.value, password.value)
        : await api.login(email.value, password.value);
      setAuth(data.token, data.user);
      // authState.isLoggedIn becomes true -> App re-renders to Dashboard
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return (
    <div class="min-h-screen bg-gray-50/50 dark:bg-[#0f0f11] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div class="w-full max-w-[440px] mx-auto">
        <div class="bg-white dark:bg-[#18181b] py-10 px-6 sm:py-12 sm:px-8 border border-gray-100 dark:border-gray-800 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div class="flex flex-col items-center mb-10">
            <div class="w-14 h-14 flex items-center justify-center mb-5">
              <img src="/favicon.svg" alt="Diskus Logo" class="w-14 h-14" />
            </div>
            <h2 class="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Diskus
            </h2>
            <p class="mt-2 text-center text-[15px] text-gray-500 dark:text-gray-400">
              {isRegistering.value
                ? "Create your admin account"
                : "Welcome back! Sign in to continue"}
            </p>
          </div>

          <form class="space-y-6" onSubmit={handleSubmit}>
            {error.value && (
              <div class="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 text-center font-medium">
                {error.value}
              </div>
            )}

            <div class="space-y-1.5">
              <label
                for="email"
                class="block text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase"
              >
                Email address
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail class="h-5 w-5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  class="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 dark:bg-[#1f1f22] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#18181b] transition-all sm:text-sm font-medium"
                  placeholder="name@example.com"
                  value={email.value}
                  onInput={(e) => (email.value = (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label
                for="password"
                class="block text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase"
              >
                Password
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock class="h-5 w-5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  class="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 dark:bg-[#1f1f22] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#18181b] transition-all sm:text-sm font-medium"
                  placeholder="••••••••"
                  value={password.value}
                  onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div class="flex items-center pt-2">
              <label class="flex items-center gap-3 cursor-pointer group">
                <div class="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="checkbox"
                    class="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer"
                    checked={rememberMe.value}
                    onChange={(e) => (rememberMe.value = (e.target as HTMLInputElement).checked)}
                  />
                  <svg
                    class="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M3 8L6 11L11 3.5"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      stroke="currentColor"
                    />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                  Remember me
                </span>
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
                    {isRegistering.value ? "Create Account" : "Sign In"}
                  </>
                )}
              </button>
            </div>

            {setupRequired.value && (
              <div class="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    isRegistering.value = !isRegistering.value;
                    error.value = "";
                  }}
                  class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  {isRegistering.value
                    ? "Already have an account? Sign In"
                    : "First time setup? Create Admin Account"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
