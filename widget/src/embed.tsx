import { render } from 'preact';
import { DiskusWidget } from './components/DiskusWidget';
import { applyHostTheme, HostTheme } from './lib/theme';
import { embedToken as embedTokenSignal } from './lib/embed';
// @ts-ignore
import styles from './index.css?inline';

(function() {
  // OAUTH POPUP REDIRECT HANDLER (For browsers blocking window.opener like Brave)
  if (typeof window !== 'undefined' && window.location.hash.includes('diskus_oauth_token=')) {
    try {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('diskus_oauth_token');
      const userStr = params.get('user');
      if (token && userStr) {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('diskus_oauth_result', JSON.stringify({ token, user }));

        // Clear sensitive token data from URL immediately (Finding #4)
        history.replaceState(null, '', window.location.pathname + window.location.search);

        if (window.opener) {
          // Post to same origin only (Finding #3)
          window.opener.postMessage({ type: 'DISKUS_OAUTH_SUCCESS', token, user }, window.location.origin);
        }
        window.close();
        document.body.innerHTML = 'Authentication successful! You can close this window.';
        return; // Halt widget execution
      }
    } catch(e) {
      console.warn('[Diskus] Failed to process OAuth redirect:', e);
    }
  }

  const pendingInits = new WeakMap<HTMLElement, Promise<void>>();

  function getContainerSignature(el: HTMLElement): string {
    return [
      el.getAttribute('data-app-id'),
      el.getAttribute('data-thread-key'),
      el.getAttribute('data-api-url'),
      el.getAttribute('data-title'),
    ].join('|');
  }

  function needsInit(el: HTMLElement): boolean {
    if (!el.isConnected) return false;
    if (!el.getAttribute('data-app-id') || !el.getAttribute('data-thread-key')) return false;
    const sig = getContainerSignature(el);
    if (el.dataset.diskusInit === sig && el.shadowRoot) return false;
    return true;
  }

  function findContainers(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>('#diskus-thread, [data-diskus-embed]')
    );
  }

  function showEmbedError(rootElement: HTMLElement, message: string) {
    if (rootElement.shadowRoot) {
      rootElement.shadowRoot.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:1rem;color:#6b7280;font-size:14px;text-align:center;border:1px dashed #e5e7eb;border-radius:8px;">${message}</div>`;
    } else {
      rootElement.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:1rem;color:#6b7280;font-size:14px;text-align:center;border:1px dashed #e5e7eb;border-radius:8px;">${message}</div>`;
    }
  }

  async function initDiskusWidget(rootElement: HTMLElement) {
    if (!needsInit(rootElement)) return;

    const existing = pendingInits.get(rootElement);
    if (existing) return existing;

    const initPromise = (async () => {
      const apiKey = rootElement.getAttribute('data-app-id');
      const threadKey = rootElement.getAttribute('data-thread-key');
      const apiUrl = rootElement.getAttribute('data-api-url') || 'http://localhost:3000/api/v1';

      if (!apiKey || !threadKey) {
        console.error('Diskus Widget: Missing data-app-id or data-thread-key attributes.');
        return;
      }

      let embedToken = '';
      try {
        const tokenRes = await fetch(`${apiUrl}/widget/embed-token?api_key=${encodeURIComponent(apiKey)}`, {
          credentials: 'omit',
        });
        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}));
          showEmbedError(
            rootElement,
            errData.error || 'Comments are not available on this domain.'
          );
          return;
        }
        const tokenData = await tokenRes.json();
        embedToken = tokenData.token;
        embedTokenSignal.value = embedToken;
      } catch (err) {
        console.error('Diskus Widget: Failed to obtain embed token.', err);
        showEmbedError(rootElement, 'Unable to load comments. Please try again later.');
        return;
      }

      // Re-check after async work
      if (!rootElement.isConnected || !needsInit(rootElement)) return;

      const getHostTheme = (): 'light' | 'dark' => {
        const html = document.documentElement;
        const body = document.body || html;

        // 1. Check explicit container theme override (if developer wants to force a theme)
        const forcedTheme = rootElement.getAttribute('data-theme');
        if (forcedTheme === 'dark' || forcedTheme === 'light') return forcedTheme;

        // 2. Check standard theme classes
        if (html.classList.contains('dark') || body.classList.contains('dark')) return 'dark';
        if (html.classList.contains('light') || body.classList.contains('light')) return 'light';

        // 3. Check data-theme attributes
        const htmlTheme = html.getAttribute('data-theme');
        const bodyTheme = body.getAttribute('data-theme');
        if (htmlTheme === 'dark' || bodyTheme === 'dark') return 'dark';
        if (htmlTheme === 'light' || bodyTheme === 'light') return 'light';

        // 4. Check computed color scheme
        const colorScheme = getComputedStyle(html).colorScheme;
        if (colorScheme === 'dark') return 'dark';
        if (colorScheme === 'light') return 'light';

        // 5. Bulletproof fallback: Check actual background color brightness
        try {
          let bg = getComputedStyle(body).backgroundColor;
          if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
            bg = getComputedStyle(html).backgroundColor;
          }
          if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
              const r = parseInt(match[1]);
              const g = parseInt(match[2]);
              const b = parseInt(match[3]);
              const brightness = Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
              return brightness > 127.5 ? 'light' : 'dark';
            }
          }
        } catch (e) {}

        // 6. Last resort: System preference
        if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
      };

      const providedTitle = rootElement.getAttribute('data-title');
      const finalTitle = providedTitle || document.title;
      const initialTheme = getHostTheme();

      applyHostTheme(initialTheme);

      // Create Shadow DOM
      if (!rootElement.shadowRoot) {
        rootElement.attachShadow({ mode: 'open' });
      }
      const shadow = rootElement.shadowRoot!;
      shadow.innerHTML = ''; // Clear previous content if any

      // Extract and inject @property rules into the host document <head>
      // This is required because browsers ignore @property definitions inside a Shadow DOM.
      const propertyRegex = /@property\s+--[\w-]+\s*\{[^}]+\}/g;
      const propertyRules = styles.match(propertyRegex) || [];
      if (propertyRules.length > 0) {
        const headStyle = document.createElement('style');
        headStyle.id = 'diskus-properties';
        headStyle.textContent = propertyRules.join('\n');
        if (!document.getElementById('diskus-properties')) {
          document.head.appendChild(headStyle);
        }
      }

      // Inject Tailwind CSS into Shadow DOM
      const styleTag = document.createElement('style');
      styleTag.textContent = styles.replace(/:root/g, ':host');
      shadow.appendChild(styleTag);

      // Create App Container
      const appContainer = document.createElement('div');
      appContainer.id = 'app';
      // Pass the current theme down as class
      if (initialTheme === 'dark') {
        appContainer.classList.add('dark');
      }
      shadow.appendChild(appContainer);

      let currentTheme = initialTheme;
      const syncTheme = () => {
        const newTheme = getHostTheme();
        if (newTheme !== currentTheme) {
          currentTheme = newTheme;
          applyHostTheme(newTheme as HostTheme);
          if (newTheme === 'dark') {
            appContainer.classList.add('dark');
          } else {
            appContainer.classList.remove('dark');
          }
        }
      };

      const themeObserver = new MutationObserver(syncTheme);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
      if (document.body) {
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
      }

      const darkMq = window.matchMedia?.('(prefers-color-scheme: dark)');
      darkMq?.addEventListener('change', syncTheme);

      // Render Preact App
      render(<DiskusWidget apiKey={apiKey} threadKey={threadKey} apiUrl={apiUrl} title={finalTitle} embedToken={embedToken} />, appContainer);

      rootElement.dataset.diskusInit = getContainerSignature(rootElement);
    })();

    pendingInits.set(rootElement, initPromise);
    try {
      await initPromise;
    } finally {
      pendingInits.delete(rootElement);
    }
  }

  let scanScheduled = false;
  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      scanAndInit();
    });
  }

  function scanAndInit() {
    findContainers().forEach(el => initDiskusWidget(el));
  }

  function setupSpaSupport() {
    const spaObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target.id === 'diskus-thread' || target.hasAttribute('data-diskus-embed')) {
            scheduleScan();
            return;
          }
        }
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              if (node.id === 'diskus-thread' || node.hasAttribute('data-diskus-embed') || node.querySelector('#diskus-thread, [data-diskus-embed]')) {
                scheduleScan();
                return;
              }
            }
          }
        }
      }
    });

    if (document.body) {
      spaObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-thread-key', 'data-app-id', 'data-title', 'data-api-url'],
      });
    }

    // Framework-specific hooks
    document.addEventListener('astro:page-load', scheduleScan);
    document.addEventListener('astro:after-swap', scheduleScan);

    // Universal SPA support
    window.addEventListener('popstate', scheduleScan);
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    history.pushState = (...args) => {
      originalPushState(...args);
      scheduleScan();
    };
    history.replaceState = (...args) => {
      originalReplaceState(...args);
      scheduleScan();
    };
  }

  if ((window as any).DiskusWidget) {
    (window as any).DiskusWidget.init();
    return;
  }

  scheduleScan();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleScan);
  }
  setupSpaSupport();

  (window as any).DiskusWidget = {
    init: scheduleScan,
  };
})();
