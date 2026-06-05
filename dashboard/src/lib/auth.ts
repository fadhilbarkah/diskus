import { signal, computed } from '@preact/signals';

// Try to load token from localStorage on boot
const storedToken = localStorage.getItem('diskus_token');
const storedUser = localStorage.getItem('diskus_user');

const token = signal<string | null>(storedToken);
const user = signal<{id: string, name?: string, email: string, role: string} | null>(storedUser ? JSON.parse(storedUser) : null);
const isLoggedIn = computed(() => !!token.value);

export const authState = {
  token,
  user,
  isLoggedIn,
};

export function setAuth(newToken: string, newUser: {id: string, name?: string, email: string, role: string}) {
  localStorage.setItem('diskus_token', newToken);
  localStorage.setItem('diskus_user', JSON.stringify(newUser));
  token.value = newToken;
  user.value = newUser;
}

export function updateUser(data: {name?: string, email?: string}) {
  if (user.value) {
    const updatedUser = { ...user.value, ...data };
    localStorage.setItem('diskus_user', JSON.stringify(updatedUser));
    user.value = updatedUser;
  }
}

export function logout() {
  localStorage.removeItem('diskus_token');
  localStorage.removeItem('diskus_user');
  token.value = null;
  user.value = null;
}
