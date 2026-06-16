import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useAuth } from "../hooks/useAuth";
import {
  globalAuthError,
  globalAuthMode,
  globalAuthReason,
  globalEnabledSocialLogins,
  globalIsGuestReady,
  globalShowAuthModal,
} from "../lib/auth";

interface Props {
  apiUrl: string;
  requireLogin?: boolean;
}

export function AuthModal({ apiUrl, requireLogin }: Props) {
  const password = useSignal("");
  const submitting = useSignal(false);
  const authSuccess = useSignal("");
  const trap = useSignal("");

  const {
    guestName,
    guestEmail,
    saveInfo,
    login,
    register,
    handleGuestSubmit,
    forgotPassword,
    resetPassword,
    setPassword,
    authError,
  } = useAuth(apiUrl, !!requireLogin);

  const handleModalSubmit = async (e: Event) => {
    e.preventDefault();
    globalAuthError.value = "";
    authSuccess.value = "";
    submitting.value = true;

    if (globalAuthMode.value === "guest") {
      if (!guestName.value || !guestEmail.value) {
        submitting.value = false;
        return;
      }
      globalIsGuestReady.value = true;
      handleGuestSubmit(guestName.value, guestEmail.value);
      globalShowAuthModal.value = false;
    } else if (globalAuthMode.value === "login") {
      if (!guestEmail.value || !password.value) {
        submitting.value = false;
        return;
      }
      const success = await login(guestEmail.value, password.value);
      if (success) {
        globalShowAuthModal.value = false;
      } else {
        globalAuthError.value = authError.value || "Invalid email or password";
      }
    } else if (globalAuthMode.value === "register") {
      if (!guestName.value || !guestEmail.value || !password.value) {
        submitting.value = false;
        return;
      }
      const success = await register(guestEmail.value, guestName.value, password.value, trap.value);
      if (success) {
        globalShowAuthModal.value = false;
      } else {
        globalAuthError.value = authError.value || "Registration failed";
      }
    } else if (globalAuthMode.value === "forgot_password") {
      if (!guestEmail.value) return (submitting.value = false), undefined;
      const success = await forgotPassword(guestEmail.value);
      if (success) {
        authSuccess.value = "Password reset link sent to your email.";
      }
    } else if (globalAuthMode.value === "reset_password") {
      import("../lib/auth").then(async ({ globalResetToken }) => {
        if (!password.value || !globalResetToken.value)
          return (submitting.value = false), undefined;
        const success = await resetPassword(globalResetToken.value, password.value);
        if (success) {
          authSuccess.value = "Password reset successful. Please log in with your new password.";
          globalAuthMode.value = "login";
          globalResetToken.value = null;
          password.value = "";
          const url = new URL(window.location.href);
          url.searchParams.delete("reset_token");
          window.history.replaceState({}, "", url.toString());
        }
        submitting.value = false;
      });
      return;
    } else if (globalAuthMode.value === "set_password") {
      if (!password.value) return (submitting.value = false), undefined;
      const success = await setPassword(password.value);
      if (success) {
        authSuccess.value = "Password has been set successfully.";
        setTimeout(() => (globalShowAuthModal.value = false), 2000);
      }
    }
    submitting.value = false;
  };

  useEffect(() => {
    // Derive the expected API origin for postMessage validation (Finding #3)
    let expectedOrigin = "";
    try {
      expectedOrigin = new URL(apiUrl).origin;
    } catch {}

    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our own API origin or same origin
      if (
        expectedOrigin &&
        event.origin !== expectedOrigin &&
        event.origin !== window.location.origin
      )
        return;

      if (event.data?.type === "DISKUS_OAUTH_SUCCESS") {
        const { token, user } = event.data;
        if (token && user) {
          import("../lib/auth").then(({ setWidgetAuth }) => {
            setWidgetAuth(token, user);
            globalShowAuthModal.value = false;
            submitting.value = false;
          });
        }
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "diskus_oauth_result" && event.newValue) {
        try {
          const { token, user } = JSON.parse(event.newValue);
          if (token && user) {
            import("../lib/auth").then(({ setWidgetAuth }) => {
              setWidgetAuth(token, user);
              globalShowAuthModal.value = false;
              submitting.value = false;
              localStorage.removeItem("diskus_oauth_result");
            });
          }
        } catch (_err) {}
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleOAuth = (provider: string) => {
    submitting.value = true;
    const origin = encodeURIComponent(window.location.origin + window.location.pathname);
    const url = `${apiUrl}/oauth/${provider}?origin=${origin}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      url,
      `diskus_oauth_${provider}`,
      `width=${width},height=${height},left=${left},top=${top},popup=1`,
    );

    // Safety timeout in case popup gets blocked or closed
    setTimeout(() => {
      if (submitting.value && globalShowAuthModal.value) {
        submitting.value = false;
      }
    }, 120000); // 2 minutes
  };

  if (!globalShowAuthModal.value) return null;

  return (
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-transparent backdrop-blur-sm animate-in fade-in duration-200">
      <div
        class={`relative w-full min-w-0 ${globalAuthMode.value === "invalid_reset_token" ? "max-w-[400px]" : "max-w-[700px] min-[480px]:flex-row"} max-h-[95vh] overflow-y-auto bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200`}
      >
        <button
          onClick={() => (globalShowAuthModal.value = false)}
          class="absolute top-4 right-4 z-10 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div
          class={`w-full ${globalAuthMode.value === "invalid_reset_token" ? "" : "min-[480px]:w-[45%] min-[480px]:border-b-0 min-[480px]:border-r"} bg-gray-50/50 dark:bg-[#161616] p-6 min-[480px]:p-8 flex flex-col justify-center border-b border-gray-100 dark:border-gray-800/60`}
        >
          <div class="mt-2 min-[480px]:mt-0">
            <h3 class="text-[20px] font-bold text-gray-900 dark:text-white leading-tight">
              {globalAuthMode.value === "login"
                ? "Welcome back 👋"
                : globalAuthMode.value === "register"
                  ? "Create account ✨"
                  : globalAuthMode.value === "forgot_password"
                    ? "Reset password 🔑"
                    : globalAuthMode.value === "reset_password"
                      ? "New password 🔐"
                      : globalAuthMode.value === "set_password"
                        ? "Set password 🔐"
                        : globalAuthMode.value === "invalid_reset_token"
                          ? "Link expired ⚠️"
                          : globalAuthReason.value === "like"
                            ? "Login required 🔒"
                            : "Leave a comment ✍️"}
            </h3>
            <p class="text-[14px] text-gray-500 dark:text-gray-400 mt-2.5">
              {globalAuthMode.value === "login"
                ? globalAuthReason.value === "like"
                  ? "Sign in to like this comment."
                  : "Sign in to leave a comment."
                : globalAuthMode.value === "register"
                  ? "Join our community."
                  : globalAuthMode.value === "forgot_password"
                    ? "Enter your email to receive a reset link."
                    : globalAuthMode.value === "reset_password"
                      ? "Enter your new password below."
                      : globalAuthMode.value === "set_password"
                        ? "Set a password for your account to login with email."
                        : globalAuthMode.value === "invalid_reset_token"
                          ? "This password reset link is invalid or has expired."
                          : "Fill in your details to comment as a guest."}
            </p>
          </div>

          <div class="mt-8 flex flex-col gap-3 text-[14px]">
            {globalAuthMode.value === "invalid_reset_token" && (
              <button
                type="button"
                onClick={() => {
                  globalAuthMode.value = "forgot_password";
                  authSuccess.value = "";
                  globalAuthError.value = "";
                }}
                class="w-full mt-2 py-3 bg-gray-100 dark:bg-[#27272a] text-gray-900 dark:text-gray-100 text-[14px] font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-[#3f3f46] transition-all shadow-sm"
              >
                Request new link
              </button>
            )}
            {globalAuthMode.value !== "login" &&
              globalAuthMode.value !== "reset_password" &&
              globalAuthMode.value !== "set_password" &&
              globalAuthMode.value !== "invalid_reset_token" && (
                <div class="text-gray-500 dark:text-gray-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      globalAuthMode.value = "login";
                      authSuccess.value = "";
                    }}
                    class="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Sign in
                  </button>
                </div>
              )}
            {globalAuthMode.value !== "register" &&
              globalAuthMode.value !== "reset_password" &&
              globalAuthMode.value !== "set_password" &&
              globalAuthMode.value !== "invalid_reset_token" && (
                <div class="text-gray-500 dark:text-gray-400">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      globalAuthMode.value = "register";
                      authSuccess.value = "";
                    }}
                    class="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Register
                  </button>
                </div>
              )}
            {globalAuthMode.value !== "guest" &&
              !requireLogin &&
              globalAuthReason.value !== "like" &&
              globalAuthMode.value !== "reset_password" &&
              globalAuthMode.value !== "set_password" &&
              globalAuthMode.value !== "invalid_reset_token" && (
                <div class="text-gray-500 dark:text-gray-400 mt-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                  Or just want to{" "}
                  <button
                    type="button"
                    onClick={() => {
                      globalAuthMode.value = "guest";
                      authSuccess.value = "";
                    }}
                    class="text-gray-900 dark:text-white font-medium hover:underline"
                  >
                    comment as Guest
                  </button>
                </div>
              )}
          </div>
        </div>

        {globalAuthMode.value !== "invalid_reset_token" && (
          <div class="w-full min-[480px]:w-[55%] p-6 min-[480px]:p-8 min-[480px]:pt-12">
            <form onSubmit={handleModalSubmit} class="flex flex-col gap-4">
              <input
                type="text"
                name="_diskus_trap"
                value={trap.value}
                onInput={(e) => (trap.value = (e.target as HTMLInputElement).value)}
                style={{ display: "none", position: "absolute", opacity: 0 }}
                tabIndex={-1}
                autoComplete="off"
              />

              {authSuccess.value && (
                <div class="p-3 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 text-[13px] font-medium rounded-xl">
                  {authSuccess.value}
                </div>
              )}
              {globalAuthError.value && (
                <div class="p-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-[13px] font-medium rounded-xl">
                  {globalAuthError.value}
                </div>
              )}

              {(globalAuthMode.value === "login" || globalAuthMode.value === "register") &&
                globalEnabledSocialLogins.value.length > 0 && (
                  <div class="flex flex-col gap-3 mb-2">
                    <div class="flex gap-2 justify-center">
                      {globalEnabledSocialLogins.value.includes("google") && (
                        <button
                          type="button"
                          onClick={() => handleOAuth("google")}
                          class="flex-1 py-2.5 flex justify-center items-center gap-2 border border-gray-200 dark:border-gray-700/80 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#1a1a1a]"
                        >
                          <svg class="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                            <path fill="none" d="M1 1h22v22H1z" />
                          </svg>
                        </button>
                      )}
                      {globalEnabledSocialLogins.value.includes("github") && (
                        <button
                          type="button"
                          onClick={() => handleOAuth("github")}
                          class="flex-1 py-2.5 flex justify-center items-center gap-2 border border-gray-200 dark:border-gray-700/80 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#1a1a1a]"
                        >
                          <svg
                            class="w-5 h-5 text-gray-900 dark:text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div class="relative flex items-center py-2">
                      <div class="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                      <span class="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 text-[12px] font-medium">
                        Or continue with email
                      </span>
                      <div class="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                    </div>
                  </div>
                )}

              {(globalAuthMode.value === "guest" || globalAuthMode.value === "register") && (
                <div class="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Name"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors"
                    value={guestName.value}
                    onInput={(e) => (guestName.value = (e.target as HTMLInputElement).value)}
                    required
                  />
                </div>
              )}

              {globalAuthMode.value !== "reset_password" &&
                globalAuthMode.value !== "set_password" && (
                  <div class="relative">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <input
                      type="email"
                      placeholder="Email"
                      class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors"
                      value={guestEmail.value}
                      onInput={(e) => (guestEmail.value = (e.target as HTMLInputElement).value)}
                      required
                    />
                  </div>
                )}

              {(globalAuthMode.value === "login" ||
                globalAuthMode.value === "register" ||
                globalAuthMode.value === "reset_password" ||
                globalAuthMode.value === "set_password") && (
                <div class="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    placeholder="Password"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-[#1a1a1a] transition-colors"
                    value={password.value}
                    onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
                    required
                  />
                </div>
              )}

              {globalAuthMode.value === "login" && (
                <div class="flex justify-end mt-[-8px]">
                  <button
                    type="button"
                    onClick={() => {
                      globalAuthMode.value = "forgot_password";
                      authSuccess.value = "";
                      globalAuthError.value = "";
                    }}
                    class="text-[13px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {globalAuthMode.value === "guest" && (
                <label class="flex items-start gap-2 mt-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={saveInfo.value}
                    onChange={(e) => (saveInfo.value = (e.target as HTMLInputElement).checked)}
                    class="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-900 cursor-pointer transition-colors"
                  />
                  <span class="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 select-none transition-colors">
                    Remember me
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting.value}
                class="w-full mt-2 py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting.value
                  ? "Please wait..."
                  : globalAuthMode.value === "login"
                    ? "Login"
                    : globalAuthMode.value === "register"
                      ? "Register"
                      : globalAuthMode.value === "forgot_password"
                        ? "Send reset link"
                        : globalAuthMode.value === "reset_password"
                          ? "Reset password"
                          : globalAuthMode.value === "set_password"
                            ? "Save password"
                            : "Continue as Guest"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
