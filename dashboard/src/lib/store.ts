import { signal, effect } from '@preact/signals';

export const userSites = signal<any[]>([]);
export const selectedSiteId = signal<string | null>(localStorage.getItem('diskus_selected_site_id') || null);

export type Theme = 'light' | 'dark' | 'system';
export const theme = signal<Theme>((localStorage.getItem('diskus_theme') as Theme) || 'system');

effect(() => {
  if (selectedSiteId.value) {
    localStorage.setItem('diskus_selected_site_id', selectedSiteId.value);
  } else {
    localStorage.removeItem('diskus_selected_site_id');
  }
});

effect(() => {
  localStorage.setItem('diskus_theme', theme.value);
  const root = window.document.documentElement;
  
  if (theme.value === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.remove('light', 'dark');
    root.classList.add(systemTheme);
  } else {
    root.classList.remove('light', 'dark');
    root.classList.add(theme.value);
  }
});

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (theme.value === 'system') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    }
  });
}
