import { authState, logout } from './auth';

const API_BASE = '/api/v1';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = authState.token.value;
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON response: ${text.substring(0, 50)}... (${msg})`);
  }
  
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

export const api = {
  // Auth
  login: (email: string, password: string) => 
    fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    
  // Admin
  getAnalytics: (siteId?: string | null) => fetchWithAuth(`/admin/analytics/summary${siteId ? `?siteId=${siteId}` : ''}`),
  getComments: (status: string, siteId?: string | null) => fetchWithAuth(`/admin/comments?status=${status}${siteId ? `&siteId=${siteId}` : ''}`),
  bulkUpdateComments: (ids: string[], status: string) => 
    fetchWithAuth('/admin/comments/bulk', { method: 'PATCH', body: JSON.stringify({ ids, status }) }),
  togglePinComment: (id: string, isPinned: boolean) =>
    fetchWithAuth(`/admin/comments/${id}/pin`, { method: 'PATCH', body: JSON.stringify({ isPinned }) }),
  deleteComments: (ids: string[]) => 
    fetchWithAuth('/admin/comments/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
  getSites: () => fetchWithAuth('/admin/sites'),
  createSite: (domain: string) => 
    fetchWithAuth('/admin/sites', { method: 'POST', body: JSON.stringify({ domain }) }),
  updateSite: (id: string, data: any) => 
    fetchWithAuth(`/admin/sites/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSite: (id: string) => 
    fetchWithAuth(`/admin/sites/${id}`, { method: 'DELETE' }),

  getAccount: () => fetchWithAuth('/admin/account'),
  updateAccount: (data: any) => fetchWithAuth('/admin/account', { method: 'PUT', body: JSON.stringify(data) }),

  // Data Management
  exportComments: (siteId: string) => fetchWithAuth(`/admin/export/${siteId}`),
  importComments: (siteId: string, data: any) => fetchWithAuth(`/admin/import/${siteId}`, { method: 'POST', body: JSON.stringify(data) }),

  getUsers: () => fetchWithAuth('/admin/users'),
  deleteUser: (id: string) => fetchWithAuth(`/admin/users/${id}`, { method: 'DELETE' }),
};
