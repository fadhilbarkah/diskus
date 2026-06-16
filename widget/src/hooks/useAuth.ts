import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  clearGuestAuth,
  globalGuestEmail,
  globalGuestName,
  globalIsGuestReady,
  logoutWidget,
  setGuestAuth,
  setWidgetAuth,
  widgetToken,
  widgetUser,
} from "../lib/auth";

export function useAuth(apiUrl: string, requireLogin: boolean) {
  const authMode = useSignal<"guest" | "login" | "register" | "forgot_password" | "reset_password">(
    requireLogin ? "login" : "guest",
  );
  const authError = useSignal("");

  const saveInfo = useSignal(true);

  useEffect(() => {
    if (requireLogin && authMode.value === "guest") {
      authMode.value = "login";
    }
  }, [requireLogin]);

  const login = async (email: string, password: string): Promise<boolean> => {
    authError.value = "";
    try {
      const res = await fetch(`${apiUrl}/widget/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  const register = async (
    email: string,
    name: string,
    password: string,
    trap: string,
  ): Promise<boolean> => {
    authError.value = "";
    try {
      const res = await fetch(`${apiUrl}/widget/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          password,
          _diskus_trap: trap,
          origin_url: window.location.href,
        }),
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

  const forgotPassword = async (email: string): Promise<boolean> => {
    authError.value = "";
    try {
      const res = await fetch(`${apiUrl}/widget/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, origin_url: window.location.href }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return true;
    } catch (err: any) {
      authError.value = err.message;
      return false;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
    authError.value = "";
    try {
      const res = await fetch(`${apiUrl}/widget/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return true;
    } catch (err: any) {
      authError.value = err.message;
      return false;
    }
  };

  const setPassword = async (newPassword: string): Promise<boolean> => {
    authError.value = "";
    try {
      const res = await fetch(`${apiUrl}/widget/auth/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${widgetToken.peek()}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) return true;
      const data = await res.json();
      authError.value = data.error || "Failed to set password";
      return false;
    } catch (err: any) {
      authError.value = err.message;
      return false;
    }
  };

  const resendVerification = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${apiUrl}/widget/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${widgetToken.value}`,
        },
        body: JSON.stringify({ origin_url: window.location.href }),
      });
      return res.ok;
    } catch {
      return false;
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
    handleGuestSubmit,
    forgotPassword,
    resetPassword,
    setPassword,
    resendVerification,
  };
}
