import React, { useMemo } from 'react';
import type { Seat as SeatType } from '../types/index.js';

interface SeatProps {
  seat: SeatType;
  isSelected: boolean;
  countdown?: number;
  onSelect: () => void;
  onDeselect: () => void;
  disabled?: boolean;
}

/**
 * Individual Seat Component
 */
export const Seat: React.FC<SeatProps> = ({
  seat,
  isSelected,
  countdown,
  onSelect,
  onDeselect,
  disabled = false,
}) => {
  const handleClick = () => {
    if (disabled) return;
    if (isSelected) {
      onDeselect();
    } else {
      onSelect();
    }
  };

  const baseClasses =
    'relative w-8 h-8 rounded border-2 font-semibold text-xs flex items-center justify-center cursor-pointer transition-all hover:shadow-lg';

  const statusClasses = useMemo(() => {
    if (isSelected) return 'bg-purple-500 border-purple-600 text-white shadow-md';
    if (disabled) {
      if (seat.status === 'SOLD')
        return 'bg-green-500 border-green-600 text-white cursor-not-allowed';
      if (seat.status === 'HOLD')
        return 'bg-yellow-500 border-yellow-600 text-white cursor-not-allowed opacity-70';
      return 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed';
    }
    return 'bg-blue-500 border-blue-600 text-white hover:bg-blue-600';
  }, [isSelected, disabled, seat.status]);

  const countdownText = useMemo(() => {
    if (!countdown || countdown <= 0) return '';
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [countdown]);

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`${baseClasses} ${statusClasses}`}
        title={`${seat.seat_code} - ${seat.price.toLocaleString()}đ`}
      >
        {seat.seat_code}
      </button>

      {/* Countdown Timer */}
      {isSelected && countdownText && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-red-600 whitespace-nowrap">
          {countdownText}
        </div>
      )}

      {/* Price tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {seat.price.toLocaleString()}đ
      </div>
    </div>
  );
};

export default Seat;
