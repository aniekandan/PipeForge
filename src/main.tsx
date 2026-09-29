import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against third-party Chrome extension / iframe bridge message timeouts
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || '';
    if (
      msg.includes('chrome: call method') ||
      msg.includes('Extension context') ||
      msg.includes('message channel closed') ||
      msg.includes('ResizeObserver loop')
    ) {
      // Prevent browser / host runtime from surfacing external extension communication timeouts
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('chrome: call method') ||
      msg.includes('ResizeObserver loop limit exceeded')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
