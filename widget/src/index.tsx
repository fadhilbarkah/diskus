import { render } from 'preact';
import './index.css';
import { DiskusWidget } from './components/DiskusWidget';

function mount() {
  const rootElement = document.getElementById('app');
  if (!rootElement) {
    console.error('Diskus Widget: Could not find element with id "app" in iframe.');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const apiKey = params.get('api_key');
  const threadKey = params.get('thread_key');
  const apiUrl = params.get('api_url') || 'http://localhost:3000/api/v1';

  if (!apiKey || !threadKey) {
    console.error('Diskus Widget: Missing api_key or thread_key query parameters.');
    rootElement.innerHTML = '<div style="color:red; font-family:sans-serif; padding:1rem;">Error: Missing configuration.</div>';
    return;
  }

  // Set up resize observer to communicate height back to parent window
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === document.body) {
        const height = entry.target.scrollHeight;
        window.parent.postMessage({ type: 'diskus-resize', height }, '*');
      }
    }
  });
  
  observer.observe(document.body);

  render(<DiskusWidget apiKey={apiKey} threadKey={threadKey} apiUrl={apiUrl} />, rootElement);
}

// Auto-mount when the script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
