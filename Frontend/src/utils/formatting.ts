/**
 * Format number to Vietnamese currency format
 */
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

/**
 * Format date to readable format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get remaining time in seconds
 */
export const getTimeRemaining = (expiresAt: string): number => {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  return Math.max(0, Math.floor((expires - now) / 1000));
};

/**
 * Format remaining time as MM:SS
 */
export const formatTimeRemaining = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Validation utilities
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\d{10,11})$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

/**
 * Generate mock seat code
 */
export const generateSeatCode = (row: number, seat: number): string => {
  const rowLetter = String.fromCharCode(65 + row);
  return `${rowLetter}${seat}`;
};

/**
 * Delay execution for testing
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
