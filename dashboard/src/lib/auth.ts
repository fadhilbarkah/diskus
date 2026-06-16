import { computed, signal } from "@preact/signals";

function isTokenValidLocally(tokenStr: string | null): boolean {
  if (!tokenStr) return false;
  try {
    const parts = tokenStr.split(".");
    if (parts.length !== 3) return false;
    // Decode base64url payload
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now() + 5000; // 5 seconds buffer
  } catch (_e) {
    return false; // if unparseable, treat as invalid
  }
}

// Try to load token from localStorage on boot
const storedToken = localStorage.getItem("diskus_token");
const isLocallyValid = isTokenValidLocally(storedToken);

if (storedToken && !isLocallyValid) {
  // Clear expired/invalid token immediately to prevent FOUC
  localStorage.removeItem("diskus_token");
  localStorage.removeItem("diskus_user");
}

const token = signal<string | null>(isLocallyValid ? storedToken : null);
const storedUser = localStorage.getItem("diskus_user");
const user = signal<{ id: string; name?: string; email: string; role: string } | null>(
  token.value && storedUser ? JSON.parse(storedUser) : null,
);
const isLoggedIn = computed(() => !!token.value);
const isVerifying = signal<boolean>(false); // No network delay needed anymore!

export const authState = {
  token,
  user,
  isLoggedIn,
  isVerifying,
};

export function setAuth(
  newToken: string,
  newUser: { id: string; name?: string; email: string; role: string },
) {
  localStorage.setItem("diskus_token", newToken);
  localStorage.setItem("diskus_user", JSON.stringify(newUser));
  token.value = newToken;
  user.value = newUser;
}

export function updateUser(data: { name?: string; email?: string }) {
  if (user.value) {
    const updatedUser = { ...user.value, ...data };
    localStorage.setItem("diskus_user", JSON.stringify(updatedUser));
    user.value = updatedUser;
  }
}

export function logout() {
  localStorage.removeItem("diskus_token");
  localStorage.removeItem("diskus_user");
  token.value = null;
  user.value = null;
}
