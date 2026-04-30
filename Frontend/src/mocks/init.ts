/**
 * Enable MSW for development and testing
 * This file is imported in main.tsx to start the mock service worker
 */

if (import.meta.env.DEV) {
  const { worker } = await import('./browser.js');
  await worker.start({
    onUnhandledRequest: 'bypass', // Pass through unhandled requests to real API
  });
  console.log('✅ Mock Service Worker started');
}
