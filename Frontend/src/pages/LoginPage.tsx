import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../api/client.js';
import { useBookingStore } from '../store/useBookingStore.js';
import { Button } from '../components/index.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUser, setAuthToken, showNotification } = useBookingStore();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const loginMutation = useMutation({
    mutationFn: usersApi.login,
    onSuccess: (data: any) => {
      const { user, token } = data?.data || {};
      if (user && token) {
        setCurrentUser(user);
        setAuthToken(token);
        showNotification('✅ Đăng nhập thành công!', 'success');
        navigate('/events');
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        'Đăng nhập thất bại';
      showNotification(message, 'error');
    },
  });

  const registerMutation = useMutation({
    mutationFn: usersApi.register,
    onSuccess: (data: any) => {
      const { user, token } = data?.data || {};
      if (user && token) {
        setCurrentUser(user);
        setAuthToken(token);
        showNotification('✅ Đăng ký thành công!', 'success');
        navigate('/events');
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        'Đăng ký thất bại';
      showNotification(message, 'error');
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password,
      });
    } else {
      registerMutation.mutate({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
          </h1>
          <p className="text-gray-600">
            {isLogin
              ? 'Đăng nhập để tiếp tục'
              : 'Tạo tài khoản mới để bắt đầu'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và Tên
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Nhập họ và tên"
                required={!isLogin}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Nhập email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Nhập mật khẩu"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            {!isLogin && (
              <p className="text-xs text-gray-500 mt-1">
                Mật khẩu phải có ít nhất 6 ký tự
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 mt-6"
          >
            {isLoading
              ? 'Đang xử lý...'
              : isLogin
                ? 'Đăng Nhập'
                : 'Đăng Ký'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ email: '', password: '', fullName: '' });
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/events"
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Tiếp tục không đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};
