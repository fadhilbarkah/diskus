import { computed } from '@preact/signals';
import { hostTheme } from '../lib/theme';

const isDark = computed(() => hostTheme.value === 'dark');

export function useTheme() {
  return { isDark };
}
