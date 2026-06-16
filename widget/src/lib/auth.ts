import { signal } from "@preact/signals";

export interface WidgetUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  avatarSeed?: string;
  isVerified?: boolean;
  hasPassword?: boolean;
}

const storedToken = localStorage.getItem("diskus_widget_token");
const storedUserStr = localStorage.getItem("diskus_widget_user");
let initialUser = null;
if (storedUserStr) {
  try {
    initialUser = JSON.parse(storedUserStr);
  } catch (_e) {}
}

export const widgetToken = signal<string | null>(storedToken);
export const widgetUser = signal<WidgetUser | null>(initialUser);

const storedGuestName =
  typeof window !== "undefined" ? localStorage.getItem("diskus_guest_name") || "" : "";
const storedGuestEmail =
  typeof window !== "undefined" ? localStorage.getItem("diskus_guest_email") || "" : "";

export const globalGuestName = signal(storedGuestName);
export const globalGuestEmail = signal(storedGuestEmail);
export const globalIsGuestReady = signal(!!(storedGuestName && storedGuestEmail));

export const globalShowAuthModal = signal(false);
export const globalAuthMode = signal<
  | "login"
  | "register"
  | "guest"
  | "forgot_password"
  | "reset_password"
  | "set_password"
  | "invalid_reset_token"
>("login");
export const globalResetToken = signal<string | null>(null);
export const globalAuthReason = signal<"comment" | "like" | null>(null);
export const globalAuthError = signal("");

export const globalActiveMenuId = signal<string | null>(null);
export const globalActiveReplyId = signal<string | null>(null);

export const globalEnabledSocialLogins = signal<string[]>([]);

export const setGuestAuth = (name: string, email: string) => {
  try {
    localStorage.setItem("diskus_guest_name", name);
  } catch {}
  try {
    localStorage.setItem("diskus_guest_email", email);
  } catch {}
  globalGuestName.value = name;
  globalGuestEmail.value = email;
  globalIsGuestReady.value = true;
};

export const clearGuestAuth = () => {
  try {
    localStorage.removeItem("diskus_guest_name");
  } catch {}
  try {
    localStorage.removeItem("diskus_guest_email");
  } catch {}
  globalGuestName.value = "";
  globalGuestEmail.value = "";
  globalIsGuestReady.value = false;
};

export const setWidgetAuth = (token: string, user: WidgetUser) => {
  localStorage.setItem("diskus_widget_token", token);
  localStorage.setItem("diskus_widget_user", JSON.stringify(user));
  widgetToken.value = token;
  widgetUser.value = user;
};

export const logoutWidget = () => {
  localStorage.removeItem("diskus_widget_token");
  localStorage.removeItem("diskus_widget_user");
  widgetToken.value = null;
  widgetUser.value = null;
};
