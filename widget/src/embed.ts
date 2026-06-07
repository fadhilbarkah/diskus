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

  const iframeUrl = `${iframeBaseUrl}?api_key=${encodeURIComponent(apiKey)}&thread_key=${encodeURIComponent(threadKey)}&api_url=${encodeURIComponent(apiUrl)}`;

  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.style.minHeight = '300px';
  // Optional: add a class for users to target
  iframe.className = 'diskus-iframe';
  
  // Listen for messages from the iframe to adjust height
  window.addEventListener('message', (event) => {
    // Only accept messages from the iframe's origin (or any origin if we are flexible, but it's better to check)
    if (event.data && event.data.type === 'diskus-resize' && event.source === iframe.contentWindow) {
      const newHeight = event.data.height;
      if (newHeight) {
        iframe.style.height = `${newHeight}px`;
      }
    }
  });

  // Clear rootElement contents and append the iframe
  rootElement.innerHTML = '';
  rootElement.appendChild(iframe);
})();
