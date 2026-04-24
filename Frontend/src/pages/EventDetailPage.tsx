import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent, useEventSeats, useSeatSelection } from '../hooks/index.js';
import { useBookingStore } from '../store/useBookingStore.js';
import { SeatMap, Button } from '../components/index.js';

/**
 * Event Detail Page - Seat Selection
 */
export const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Sự kiện không hợp lệ</p>
        </div>
      </div>
    );
  }

  const { data: eventData, isLoading: eventLoading } = useEvent(eventId);
  const { data: seatsData, isLoading: seatsLoading } = useEventSeats(eventId);
  const { handleSelectSeat, handleDeselectSeat, selectedSeats, isHolding } =
    useSeatSelection(eventId);
  const { cart, addToCart } = useBookingStore();

  const event = eventData?.data;
  const seats = seatsData?.data || [];

  if (eventLoading || seatsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Không tìm thấy sự kiện</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.start_time);
  const dateStr = eventDate.toLocaleDateString('vi-VN');
  const timeStr = eventDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCheckout = () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế');
      return;
    }

    // Add selected seats to cart
    selectedSeats.forEach((seatCode) => {
      const seat = seats.find((s) => s.seat_code === seatCode);
      if (seat) {
        addToCart({
          seatId: seat.id,
          seatCode: seat.seat_code,
          price: seat.price,
          eventId,
        });
      }
    });

    // Navigate to checkout
    navigate(`/checkout/${eventId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800 mb-6 font-semibold"
        >
          ← Quay lại
        </button>

        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
          <div className="flex gap-6 text-gray-600">
            <div>
              <p className="text-sm text-gray-500">Ngày</p>
              <p className="font-semibold">{dateStr}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Thời gian</p>
              <p className="font-semibold">{timeStr}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seat Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Chọn ghế</h2>
              <SeatMap
                eventId={eventId}
                seats={seats}
                selectedSeats={selectedSeats}
                onSelectSeat={handleSelectSeat}
                onDeselectSeat={handleDeselectSeat}
                isLoading={isHolding}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Tóm tắt</h3>

              {/* Selected Seats */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Ghế đã chọn:</p>
                {selectedSeats.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedSeats.map((seatCode) => (
                      <span
                        key={seatCode}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded"
                      >
                        {seatCode}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mb-4">Chưa chọn ghế nào</p>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-3 border-t pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng cộng:</span>
                  <span className="font-semibold">
                    {cart.items
                      .reduce((sum, item) => sum + item.price, 0)
                      .toLocaleString()}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thuế (10%):</span>
                  <span className="font-semibold">
                    {cart.tax.toLocaleString()}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phí xử lý:</span>
                  <span className="font-semibold">
                    {cart.fees.toLocaleString()}đ
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Tổng cộng:</span>
                  <span className="text-blue-600">
                    {cart.total.toLocaleString()}đ
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={selectedSeats.length === 0}
                size="lg"
                className="w-full"
              >
                Tiến hành thanh toán
              </Button>

              {/* Info */}
              <p className="text-xs text-gray-500 mt-4">
                ℹ️ Bạn sẽ hoàn thành thanh toán trong bước tiếp theo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
