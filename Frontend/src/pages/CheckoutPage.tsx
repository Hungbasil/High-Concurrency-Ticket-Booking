import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookingStore } from '../store/useBookingStore.js';
import { useCheckout } from '../hooks/index.js';
import { Button } from '../components/index.js';

/**
 * Checkout Page
 */
export const CheckoutPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { cart, clearCart, currentUser } = useBookingStore();
  const checkoutMutation = useCheckout();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
  });

  // Debug: log cart items when they change
  React.useEffect(() => {
    console.log('Checkout cart:', cart);
  }, [cart]);

  if (!eventId) {
    return <div>Event ID không hợp lệ</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 mb-4">Giỏ hàng của bạn trống</p>
          <Button onClick={() => navigate('/events')}>Quay lại mua vé</Button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.firstName ||
      !formData.email ||
      !formData.cardNumber ||
      !formData.cardExpiry
    ) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      // For each cart item, process checkout
      for (const item of cart.items) {
        await checkoutMutation.mutateAsync({
          userId: currentUser?.id || 'temp-user',
          reservationId: item.holdId || '',
          eventId,
          seatCode: item.seatCode,
        });
      }

      // Clear cart and navigate to confirmation
      clearCart();
      navigate(`/confirmation/${eventId}`, {
        state: { seats: cart.items.map((item) => item.seatCode) },
      });
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Thanh toán</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Info */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Thông tin khách hàng
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Họ"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="col-span-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Tên"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="col-span-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-2 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Điện thoại"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="col-span-2 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Thông tin thanh toán (Demo)
                </h2>

                <div className="space-y-4">
                  <input
                    type="text"
                    name="cardName"
                    placeholder="Tên chủ thẻ"
                    value={formData.cardName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    name="cardNumber"
                    placeholder="Số thẻ (dùng: 4111111111111111)"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="cardExpiry"
                      placeholder="MM/YY"
                      value={formData.cardExpiry}
                      onChange={handleInputChange}
                      className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      name="cardCVV"
                      placeholder="CVV"
                      value={formData.cardCVV}
                      onChange={handleInputChange}
                      className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  ℹ️ Đây là môi trường demo. Không có tiền thật được xử lý.
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending
                  ? 'Đang xử lý...'
                  : `Thanh toán ${cart.total.toLocaleString()}đ`}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Tóm tắt đơn hàng
              </h2>

              <div className="space-y-3 mb-6">
                {cart.items.map((item) => (
                  <div key={item.seatId} className="flex justify-between">
                    <span className="text-gray-600">Ghế {item.seatCode}</span>
                    <span className="font-semibold">
                      {item.price.toLocaleString()}đ
                    </span>
                  </div>
                ))}

                <div className="border-t pt-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Tổng cộng:</span>
                    <span className="font-semibold">
                      {(
                        cart.items.reduce((sum, item) => sum + item.price, 0)
                      ).toLocaleString()}đ
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Thuế:</span>
                    <span className="font-semibold">
                      {cart.tax.toLocaleString()}đ
                    </span>
                  </div>
                  <div className="flex justify-between mb-3">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
