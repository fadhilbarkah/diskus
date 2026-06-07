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
  const initialTheme = params.get('theme');
  const title = params.get('title') || document.title;

  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }

  if (!apiKey || !threadKey) {
    console.error('Diskus Widget: Missing api_key or thread_key query parameters.');
    rootElement.innerHTML = '<div style="color:red; font-family:sans-serif; padding:1rem;">Error: Missing configuration.</div>';
    return;
  }

  // Set up observers to communicate height back to parent window
  const updateHeight = () => {
    // Measure the actual #app container, since document height won't shrink 
    // if the iframe window is taller than the content.
    const height = rootElement.scrollHeight;
    window.parent.postMessage({ type: 'diskus-resize', height }, '*');
  };

  const resizeObserver = new ResizeObserver(updateHeight);
  resizeObserver.observe(document.body);
  resizeObserver.observe(document.documentElement);

  const mutationObserver = new MutationObserver(updateHeight);
  mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

  // Listen for theme changes from parent
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'diskus-theme') {
      if (event.data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  });

  render(<DiskusWidget apiKey={apiKey} threadKey={threadKey} apiUrl={apiUrl} title={title} />, rootElement);
}

// Auto-mount when the script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
