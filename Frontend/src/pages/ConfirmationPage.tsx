import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../components/index.js';

interface LocationState {
  seats?: string[];
}

/**
 * Confirmation Page - Order Complete
 */
export const ConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const seats = state?.seats || [];

  const confirmationNumber = `BK${Date.now().toString().slice(-8)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
        {/* Success Icon */}
        <div className="text-6xl mb-6">✅</div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Đặt vé thành công!
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          Cảm ơn bạn đã đặt vé. Xác nhận đã được gửi đến email của bạn.
        </p>

        {/* Confirmation Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left space-y-4">
          <div>
            <p className="text-sm text-gray-600">Số xác nhận</p>
            <p className="text-lg font-bold text-gray-900">{confirmationNumber}</p>
          </div>

          {seats.length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Ghế được đặt</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {seats.map((seat) => (
                  <span
                    key={seat}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded"
                  >
                    {seat}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600">Trạng thái</p>
            <p className="text-lg font-bold text-green-600">Đã thanh toán</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-8 text-left">
          <p className="text-sm text-blue-800">
            💡 Vé của bạn sẽ được gửi qua email. Vui lòng kiểm tra thư để nhận vé.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button onClick={() => navigate('/')} className="w-full">
            Tiếp tục mua vé
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/bookings')}
            className="w-full"
          >
            Xem đơn hàng của tôi
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
