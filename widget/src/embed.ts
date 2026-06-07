(function() {
  // Prevent double execution in the same window context if re-evaluated by Astro
  if ((window as any).DiskusWidget) {
    (window as any).DiskusWidget.init();
    return;
  }

  const initializedContainers = new WeakSet<HTMLElement>();

  function initDiskusWidget(rootElement: HTMLElement) {
    if (initializedContainers.has(rootElement)) return;
    initializedContainers.add(rootElement);

    const apiKey = rootElement.getAttribute('data-api-key');
    const threadKey = rootElement.getAttribute('data-thread-key');
    const apiUrl = rootElement.getAttribute('data-api-url') || 'http://localhost:3000/api/v1';

    if (!apiKey || !threadKey) {
      console.error('Diskus Widget: Missing data-api-key or data-thread-key attributes.');
      return;
    }

    // Determine the URL of iframe.html based on the src of this script
    let iframeBaseUrl = '';
    // @ts-ignore
    if (document.currentScript && document.currentScript.src) {
      // @ts-ignore
      iframeBaseUrl = document.currentScript.src.replace(/embed\.js.*$/, 'iframe.html');
    } else {
      // Fallback if currentScript is not available (e.g. some very old browsers)
      console.error('Diskus Widget: Cannot determine script origin.');
      return;
    }

    const getHostTheme = () => {
      if (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')) {
        return 'dark';
      }
      if (document.documentElement.getAttribute('data-theme') === 'dark' || document.body.getAttribute('data-theme') === 'dark') {
        return 'dark';
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    };

    const providedTitle = rootElement.getAttribute('data-title');
    const finalTitle = providedTitle || document.title;

    const initialTheme = getHostTheme();
    // Adding cache buster here to ensure iframe.html is always fresh when loaded
    const iframeUrl = `${iframeBaseUrl}?v=${Date.now()}&api_key=${encodeURIComponent(apiKey)}&thread_key=${encodeURIComponent(threadKey)}&api_url=${encodeURIComponent(apiUrl)}&theme=${initialTheme}&title=${encodeURIComponent(finalTitle)}`;

    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
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
    
    // Observe theme changes
    let currentTheme = initialTheme;
    const themeObserver = new MutationObserver(() => {
      const newTheme = getHostTheme();
      if (newTheme !== currentTheme && iframe.contentWindow) {
        currentTheme = newTheme;
        iframe.contentWindow.postMessage({ type: 'diskus-theme', theme: newTheme }, '*');
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    // Listen for messages from the iframe to adjust height
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'diskus-resize' && event.source === iframe.contentWindow) {
        const newHeight = event.data.height;
        if (newHeight) {
          iframe.style.height = `${newHeight}px`;
          iframe.style.minHeight = 'auto';
        }
      }
    });

    // Clear rootElement contents and append the iframe
    rootElement.innerHTML = '';
    rootElement.appendChild(iframe);
  }

  // 1. Initialize any existing elements immediately
  function scanAndInit() {
    const elements = document.querySelectorAll('#diskus-thread');
    elements.forEach(el => initDiskusWidget(el as HTMLElement));
  }

  scanAndInit();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndInit);
  }

  // 2. Universal SPA Support via MutationObserver
  const spaObserver = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      scanAndInit();
    }
  });

  if (document.body) {
    spaObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      spaObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Export for manual invocation if needed
  (window as any).DiskusWidget = {
    init: scanAndInit
  };
})();
