import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

/**
 * MSW Browser Worker Setup
 * Starts the mock service worker to intercept API calls
 */
export const worker = setupWorker(...handlers);
