import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Notification } from './components/index.js';
import {
  HomePage,
  EventDetailPage,
  CheckoutPage,
  ConfirmationPage,
  NotFoundPage,
} from './pages/index.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
    },
  },
});

/**
 * Main App Component
 */
function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎫</span>
                <h1 className="text-xl font-bold text-gray-900">
                  Ticket Booking
                </h1>
              </div>
              <nav className="flex gap-6">
                <a
                  href="/"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Trang chủ
                </a>
                <a
                  href="/bookings"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Đơn hàng
                </a>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="/checkout/:eventId" element={<CheckoutPage />} />
              <Route
                path="/confirmation/:eventId"
                element={<ConfirmationPage />}
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-12">
            <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-600">
              <p>
                © 2026 High-Concurrency Ticket Booking.
              </p>
            </div>
          </footer>

          {/* Notification Container */}
          <Notification />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
