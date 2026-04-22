import React, { Suspense } from 'react';
import { useEvents } from '../hooks/index.js';
import { EventCard } from '../components/index.js';

/**
 * Home Page - Events List
 */
export const HomePage: React.FC = () => {
  const { data, isLoading, error } = useEvents();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Lỗi</h2>
          <p className="text-gray-700">Không thể tải danh sách sự kiện. Vui lòng thử lại.</p>
        </div>
      </div>
    );
  }

  const events = data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sự Kiện Sắp Tới</h1>
          <p className="text-gray-600">
            Chọn một sự kiện và đặt vé của bạn ngay hôm nay
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Hiện không có sự kiện nào.</p>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Suspense key={event.id} fallback={<div>Đang tải...</div>}>
                <EventCard event={event} />
              </Suspense>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
