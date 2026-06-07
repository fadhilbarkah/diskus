import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

export function useTheme() {
  const isDark = useSignal(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    const checkDark = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      const hostHasLightClass = document.documentElement.classList.contains('light') || document.body.classList.contains('light');
      
      if (hasDarkClass) {
        isDark.value = true;
      } else if (hostHasLightClass) {
        isDark.value = false;
      } else {
        isDark.value = prefersDark.matches;
      }
    };
    
    checkDark();
    prefersDark.addEventListener('change', checkDark);
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      prefersDark.removeEventListener('change', checkDark);
      observer.disconnect();
    };
  }, []);

  return { isDark };
}
