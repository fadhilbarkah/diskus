(function() {
  const IFRAME_BASE_KEY = '__diskusIframeBaseUrl';
  const pendingInits = new WeakMap<HTMLElement, Promise<void>>();

  function getIframeBaseUrl(): string {
    const win = window as any;

    // @ts-ignore — only available during synchronous script execution
    if (document.currentScript?.src) {
      // @ts-ignore
      const base = document.currentScript.src.replace(/embed\.js.*$/, 'iframe.html');
      win[IFRAME_BASE_KEY] = base;
      return base;
    }

    if (win[IFRAME_BASE_KEY]) return win[IFRAME_BASE_KEY];

    // Fallback: locate the embed script tag (needed for SPA re-inits after Astro navigation)
    const scripts = document.querySelectorAll('script[src*="embed.js"]');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = (scripts[i] as HTMLScriptElement).src;
      if (src) {
        const base = src.replace(/embed\.js.*$/, 'iframe.html');
        win[IFRAME_BASE_KEY] = base;
        return base;
      }
    }

    return '';
  }

  function getContainerSignature(el: HTMLElement): string {
    return [
      el.getAttribute('data-api-key'),
      el.getAttribute('data-thread-key'),
      el.getAttribute('data-api-url'),
      el.getAttribute('data-title'),
    ].join('|');
  }

  function needsInit(el: HTMLElement): boolean {
    if (!el.isConnected) return false;
    if (!el.getAttribute('data-api-key') || !el.getAttribute('data-thread-key')) return false;
    const sig = getContainerSignature(el);
    if (el.dataset.diskusInit === sig && el.querySelector('.diskus-iframe')) return false;
    return true;
  }

  function findContainers(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>('#diskus-thread, [data-diskus-embed]')
    );
  }

  function showEmbedError(rootElement: HTMLElement, message: string) {
    rootElement.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:1rem;color:#6b7280;font-size:14px;text-align:center;border:1px dashed #e5e7eb;border-radius:8px;">${message}</div>`;
  }

  async function initDiskusWidget(rootElement: HTMLElement) {
    if (!needsInit(rootElement)) return;

    const existing = pendingInits.get(rootElement);
    if (existing) return existing;

    const initPromise = (async () => {
      const apiKey = rootElement.getAttribute('data-api-key');
      const threadKey = rootElement.getAttribute('data-thread-key');
      const apiUrl = rootElement.getAttribute('data-api-url') || 'http://localhost:3000/api/v1';

      if (!apiKey || !threadKey) {
        console.error('Diskus Widget: Missing data-api-key or data-thread-key attributes.');
        return;
      }

      const iframeBaseUrl = getIframeBaseUrl();
      if (!iframeBaseUrl) {
        console.error('Diskus Widget: Cannot determine script origin.');
        return;
      }

      let embedToken = '';
      try {
        const tokenRes = await fetch(`${apiUrl}/widget/embed-token?api_key=${encodeURIComponent(apiKey)}`, {
          credentials: 'omit',
        });
        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}));
          const hostname = errData.hostname ? ` (${errData.hostname})` : '';
          const registered = errData.registeredDomain ? ` — registered: ${errData.registeredDomain}` : '';
          showEmbedError(
            rootElement,
            errData.error
              ? `${errData.error}${hostname}${registered}`
              : 'Comments are not available on this domain.'
          );
          return;
        }
        const tokenData = await tokenRes.json();
        embedToken = tokenData.token;
      } catch (err) {
        console.error('Diskus Widget: Failed to obtain embed token.', err);
        showEmbedError(rootElement, 'Unable to load comments. Please try again later.');
        return;
      }

      // Re-check after async work — container may have been swapped during navigation
      if (!rootElement.isConnected || !needsInit(rootElement)) return;

      const getHostTheme = (): 'light' | 'dark' => {
        const html = document.documentElement;
        const body = document.body;

        if (html.classList.contains('dark') || body?.classList.contains('dark')) return 'dark';
        if (html.classList.contains('light') || body?.classList.contains('light')) return 'light';

        const htmlTheme = html.getAttribute('data-theme');
        const bodyTheme = body?.getAttribute('data-theme');
        if (htmlTheme === 'dark' || bodyTheme === 'dark') return 'dark';
        if (htmlTheme === 'light' || bodyTheme === 'light') return 'light';

        const colorScheme = getComputedStyle(html).colorScheme;
        if (colorScheme === 'dark') return 'dark';
        if (colorScheme === 'light') return 'light';

        if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
      };

      const providedTitle = rootElement.getAttribute('data-title');
      const finalTitle = providedTitle || document.title;
      const initialTheme = getHostTheme();
      const iframeOrigin = (() => {
        try { return new URL(iframeBaseUrl).origin; } catch { return '*'; }
      })();

      const iframe = document.createElement('iframe');
      iframe.style.display = 'block';
      iframe.style.width = '100%';
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.outline = 'none';
      iframe.setAttribute('allowtransparency', 'true');
      iframe.style.backgroundColor = 'transparent';
      iframe.className = 'diskus-iframe';

      const iframeUrl = `${iframeBaseUrl}?v=${Date.now()}&api_key=${encodeURIComponent(apiKey)}&thread_key=${encodeURIComponent(threadKey)}&api_url=${encodeURIComponent(apiUrl)}&embed_token=${encodeURIComponent(embedToken)}&theme=${initialTheme}&title=${encodeURIComponent(finalTitle)}`;
      iframe.src = iframeUrl;

      let currentTheme = initialTheme;
      const syncTheme = () => {
        const newTheme = getHostTheme();
        if (newTheme !== currentTheme && iframe.contentWindow) {
          currentTheme = newTheme;
          iframe.contentWindow.postMessage({ type: 'diskus-theme', theme: newTheme }, iframeOrigin);
        }
      };

      const themeObserver = new MutationObserver(syncTheme);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
      if (document.body) {
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
      }

      const darkMq = window.matchMedia?.('(prefers-color-scheme: dark)');
      darkMq?.addEventListener('change', syncTheme);

      window.addEventListener('message', (event) => {
        if (event.data?.type === 'diskus-resize' && event.source === iframe.contentWindow) {
          const newHeight = event.data.height;
          if (newHeight) {
            iframe.style.height = `${newHeight}px`;
            iframe.style.minHeight = 'auto';
          }
        }
      });

      rootElement.innerHTML = '';
      rootElement.appendChild(iframe);
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
        attributeFilter: ['data-thread-key', 'data-api-key', 'data-title', 'data-api-url'],
      });
    }

    // Framework-specific hooks (no-op on sites that don't emit these events)
    document.addEventListener('astro:page-load', scheduleScan);
    document.addEventListener('astro:after-swap', scheduleScan);

    // Universal SPA / client-router support
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

  // Prevent double IIFE execution when Astro re-injects the script on navigation
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
