import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Initialize MSW (Mock Service Worker) for local development
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser.js');
  await worker.start({
    onUnhandledRequest: 'bypass',
  });
  console.log('✅ Mock Service Worker started');
}

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
