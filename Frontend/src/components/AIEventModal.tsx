import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from './Button.js';
import { Modal } from './Modal.js';
import axios from 'axios';

interface AIEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AIEventModal: React.FC<AIEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  const aiMutation = useMutation({
    mutationFn: async (userPrompt: string) => {
      const res = await axios.post('/api/events/ai/generate', {
        prompt: userPrompt
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResponse(data.message || data.data.aiMessage);
      setShowResponse(true);
      setTimeout(() => {
        onClose();
        setPrompt('');
        setResponse(null);
        setShowResponse(false);
        onSuccess?.();
      }, 2000);
    },
    onError: (error: any) => {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.message ||
        'Lỗi kết nối tới AI. Vui lòng đảm bảo Ollama đang chạy.';
      setResponse(errorMsg);
      setShowResponse(true);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      aiMutation.mutate(prompt);
    }
  };

  const handleClose = () => {
    if (!aiMutation.isPending) {
      setPrompt('');
      setResponse(null);
      setShowResponse(false);
      onClose();
    }
  };

  const suggestedPrompts = [
    'Hãy tạo một buổi hòa nhạc Trịnh Công Sơn vào cuối tuần',
    'Tôi muốn mở một sự kiện âm nhạc Kpop vào tối thứ 6',
    'Hãy tạo một concert rock nổi tiếng cho tôi'
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="🤖 AI Event Generator" size="lg">
      {!showResponse ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả sự kiện bằng tiếng Việt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: Tôi muốn tạo một buổi concert nhạc EDM..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              disabled={aiMutation.isPending}
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
                  disabled={aiMutation.isPending}
                  className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={aiMutation.isPending}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              loading={aiMutation.isPending}
              disabled={!prompt.trim() || aiMutation.isPending}
              className="flex-1"
            >
              {aiMutation.isPending ? 'Đang xử lý...' : 'Tạo Sự Kiện'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8">
          <div className="mb-4">
            {aiMutation.isSuccess ? (
              <>
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-600 font-semibold">{response}</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">❌</div>
                <p className="text-red-600 font-semibold">{response}</p>
              </>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {aiMutation.isSuccess
              ? 'Đóng modal để xem sự kiện mới...'
              : 'Vui lòng thử lại'}
          </p>
        </div>
      )}
    </Modal>
  );
};
