import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { useBookingStore } from '../store/useBookingStore.js';
import { Button } from '../components/index.js';

interface Booking {
  reservation_id: string;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  created_at: string;
  seat_code: string;
  price: number;
  event_id: string;
  title: string;
  start_time: string;
}

export const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useBookingStore();

  const { data: bookingsRes, isLoading, error } = useQuery({
    queryKey: ['userBookings'],
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        data: Booking[];
      }>('/reservations/user/me');
      return response.data;
    },
    enabled: !!currentUser,
  });

  const bookings = bookingsRes?.data || [];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            Vui lòng đăng nhập để xem vé đã đặt
          </p>
          <Button onClick={() => navigate('/login')}>Đăng nhập</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Lỗi khi tải vé</p>
          <Button onClick={() => navigate('/events')}>Quay lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vé của tôi</h1>
          <p className="text-gray-600">
            Bạn có {bookings.length} vé đã đặt
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <p className="text-gray-500 mb-4">Bạn chưa đặt vé nào</p>
            <Button onClick={() => navigate('/events')}>
              Bắt đầu đặt vé
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.reservation_id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Event Info */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {booking.title}
                    </h3>
                    <div className="space-y-2 text-gray-600">
                      <p>
                        <span className="font-semibold">Ngày:</span>{' '}
                        {new Date(booking.start_time).toLocaleDateString(
                          'vi-VN'
                        )}
                      </p>
                      <p>
                        <span className="font-semibold">Giờ:</span>{' '}
                        {new Date(booking.start_time).toLocaleTimeString(
                          'vi-VN',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Ticket Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Ghế</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {booking.seat_code}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Giá tiền</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {booking.price.toLocaleString()}đ
                        </p>
                      </div>
                      <div className="pt-2 border-t border-blue-200">
                        <p className="text-xs text-gray-600">Trạng thái</p>
                        <p className="text-sm font-semibold text-green-600">
                          ✅ Đã thanh toán
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                  Mã vé: {booking.reservation_id}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button onClick={() => navigate('/events')} variant="outline">
            Quay lại mua vé
          </Button>
        </div>
      </div>
    </div>
  );
};
