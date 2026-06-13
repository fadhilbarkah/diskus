import { signal } from '@preact/signals';

export type HostTheme = 'light' | 'dark';

/** Theme reported by the parent page via URL param or postMessage */
export const hostTheme = signal<HostTheme>('light');

export function applyHostTheme(theme: HostTheme) {
  hostTheme.value = theme;
}
