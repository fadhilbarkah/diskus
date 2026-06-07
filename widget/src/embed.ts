(function() {
  const rootElement = document.getElementById('diskus-thread');
  if (!rootElement) {
    console.error('Diskus Widget: Could not find element with id "diskus-thread".');
    return;
  }

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
  const iframeUrl = `${iframeBaseUrl}?api_key=${encodeURIComponent(apiKey)}&thread_key=${encodeURIComponent(threadKey)}&api_url=${encodeURIComponent(apiUrl)}&theme=${initialTheme}&title=${encodeURIComponent(finalTitle)}`;

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
    // Only accept messages from the iframe's origin (or any origin if we are flexible, but it's better to check)
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
})();
