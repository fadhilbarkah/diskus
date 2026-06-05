import { render } from 'preact';
import './index.css';
import { DiskusWidget } from './components/DiskusWidget';

function mount() {
  const rootElement = document.getElementById('diskus-thread');
  if (!rootElement) {
    console.error('Diskus Widget: Could not find element with id "diskus-thread".');
    return;
  }

  const apiKey = rootElement.getAttribute('data-api-key');
  const threadKey = rootElement.getAttribute('data-thread-key');
  const apiUrl = rootElement.getAttribute('data-api-url') || (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api/v1';

  if (!apiKey || !threadKey) {
    console.error('Diskus Widget: Missing data-api-key or data-thread-key attributes.');
    return;
  }

  render(<DiskusWidget apiKey={apiKey} threadKey={threadKey} apiUrl={apiUrl} />, rootElement);
}

// Auto-mount when the script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
