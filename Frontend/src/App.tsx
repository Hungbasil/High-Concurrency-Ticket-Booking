import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Notification } from './components/index.js';
import { useBookingStore } from './store/useBookingStore.js';
import {
  HomePage,
  LoginPage,
  BookingsPage,
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
 * Header Component with Auth
 */
function Header() {
  const navigate = useNavigate();
  const { currentUser, logout } = useBookingStore();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
        >
          <span className="text-2xl">🎫</span>
          <h1 className="text-xl font-bold text-gray-900">Ticket Booking</h1>
        </div>
        <nav className="flex gap-6 items-center">
          <a
            href="/"
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Trang chủ
          </a>
          {currentUser ? (
            <>
              <a
                href="/bookings"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Vé của tôi
              </a>
              <span className="text-gray-600 text-sm">
                Xin chào, <span className="font-semibold">{currentUser.name}</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium text-sm"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium text-sm"
            >
              Đăng nhập
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

/**
 * Main App Component
 */
function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Header */}
          <Header />

          {/* Main Content */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
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
              <p>© 2026 High-Concurrency Ticket Booking.</p>
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
