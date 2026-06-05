import { signal, effect } from '@preact/signals';

export const userSites = signal<any[]>([]);
export const selectedSiteId = signal<string | null>(localStorage.getItem('diskus_selected_site_id') || null);

effect(() => {
  if (selectedSiteId.value) {
    localStorage.setItem('diskus_selected_site_id', selectedSiteId.value);
  } else {
    localStorage.removeItem('diskus_selected_site_id');
  }
});
