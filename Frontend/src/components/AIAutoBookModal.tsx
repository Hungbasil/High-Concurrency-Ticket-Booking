import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button.js';
import { Modal } from './Modal.js';
import { useBookingStore } from '../store/useBookingStore.js';
import axios from 'axios';

interface AIAutoBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: () => void;
}

export const AIAutoBookModal: React.FC<AIAutoBookModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess
}) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [heldSeats, setHeldSeats] = useState<any[]>([]);
  const navigate = useNavigate();
  const { currentUser, showNotification, addToCart } = useBookingStore();

  const autoBookMutation = useMutation({
    mutationFn: async (userPrompt: string) => {
      if (!currentUser) {
        throw new Error('Bạn cần đăng nhập để sử dụng chức năng này');
      }

      const res = await axios.post('/api/reservations/ai/auto-book', {
        eventId,
        userId: currentUser.id,
        prompt: userPrompt
      });
      return res.data;
    },
    onSuccess: (data) => {
      setHeldSeats(data.data.heldSeats || []);
      setResponse(data.data.aiMessage);
      setShowResponse(true);
      showNotification(' AI đã chọn ghế thành công!', 'success');
    },
    onError: (error: any) => {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.message ||
        'Lỗi kết nối. Vui lòng thử lại.';
      setResponse(errorMsg);
      setShowResponse(true);
      showNotification(errorMsg, 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showNotification('Bạn cần đăng nhập trước', 'warning');
      onClose();
      return;
    }
    if (prompt.trim()) {
      autoBookMutation.mutate(prompt);
    }
  };

  const handleAddToCart = () => {
    if (heldSeats.length === 0) return;

    // Thêm tất cả ghế vào giỏ hàng
    heldSeats.forEach((seat) => {
      addToCart({
        seatId: seat.seatId,
        seatCode: seat.seatCode,
        price: seat.price,
        eventId,
        holdId: seat.reservationId,
        expiresAt: seat.expiresAt
      });
    });
    
    // Đóng modal và chuyển đến trang thanh toán
    onClose();
    setPrompt('');
    setResponse(null);
    setShowResponse(false);
    setHeldSeats([]);
    navigate('/checkout');
  };

  const handleClose = () => {
    if (!autoBookMutation.isPending) {
      setPrompt('');
      setResponse(null);
      setShowResponse(false);
      setHeldSeats([]);
      onClose();
    }
  };

  const suggestedPrompts = [
    'Hãy chọn 2 vé ghế tốt nhất cho tôi',
    'Tôi muốn 3 vé ghế ở giữa sân',
    'Giúp tôi chọn 1 vé ghế VIP nếu có'
  ];

  if (!currentUser) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="🤖 AI Chọn Ghế" size="lg">
      {!showResponse ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả yêu cầu chọn ghế
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: Hãy giúp tôi chọn 3 vé ghế tốt..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              disabled={autoBookMutation.isPending}
            />
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-3 font-medium">
              Gợi ý:
            </p>
            <div className="space-y-2">
              {suggestedPrompts.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  disabled={autoBookMutation.isPending}
                  className="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-700">
              ℹ️ AI sẽ chọn ghế tốt nhất. Bạn sẽ thêm vào giỏ hàng và thanh toán sau.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={autoBookMutation.isPending}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              loading={autoBookMutation.isPending}
              disabled={!prompt.trim() || autoBookMutation.isPending}
              className="flex-1"
            >
              {autoBookMutation.isPending ? 'Đang chọn...' : 'Cho AI Chọn'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8">
          <div className="mb-4">
            {autoBookMutation.isSuccess ? (
              <>
                <div className="text-4xl mb-3">✅</div>
                <p className="text-green-600 font-semibold mb-4">{response}</p>
                
                {heldSeats.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded p-4 text-left mb-4">
                    <p className="font-semibold text-green-700 mb-2">Ghế được chọn:</p>
                    <div className="space-y-1 mb-3">
                      {heldSeats.map((seat, idx) => (
                        <p key={idx} className="text-sm text-green-600">
                          • {seat.seatCode}: {seat.price.toLocaleString()}đ
                        </p>
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-green-700 border-t pt-2">
                      Tổng: {heldSeats.reduce((sum, s) => sum + s.price, 0).toLocaleString()}đ
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      ⏱️ Các ghế sẽ giữ lại trong 5 phút
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Tiếp tục chọn
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1"
                  >
                    Thanh Toán
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">❌</div>
                <p className="text-red-600 font-semibold">{response}</p>
                <Button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 w-full"
                >
                  Đóng
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
