import { signal } from '@preact/signals';

interface WidgetUser {
  id: string;
  email: string;
  name: string;
}

const storedToken = localStorage.getItem('diskus_widget_token');
const storedUserStr = localStorage.getItem('diskus_widget_user');
let initialUser = null;
if (storedUserStr) {
  try { initialUser = JSON.parse(storedUserStr); } catch (e) {}
}

export const widgetToken = signal<string | null>(storedToken);
export const widgetUser = signal<WidgetUser | null>(initialUser);

export const setWidgetAuth = (token: string, user: WidgetUser) => {
  localStorage.setItem('diskus_widget_token', token);
  localStorage.setItem('diskus_widget_user', JSON.stringify(user));
  widgetToken.value = token;
  widgetUser.value = user;
};

export const logoutWidget = () => {
  localStorage.removeItem('diskus_widget_token');
  localStorage.removeItem('diskus_widget_user');
  widgetToken.value = null;
  widgetUser.value = null;
};
