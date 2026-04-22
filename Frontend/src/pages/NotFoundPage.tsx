import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/index.js';

/**
 * 404 Not Found Page
 */
export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-900 mb-4">404</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Trang không tìm thấy
        </h1>
        <p className="text-gray-600 mb-8">
          Xin lỗi, trang bạn tìm kiếm không tồn tại.
        </p>
        <Button onClick={() => navigate('/')}>Quay về trang chủ</Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
