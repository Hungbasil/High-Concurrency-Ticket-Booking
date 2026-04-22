import React, { useMemo, useState, useEffect } from 'react';
import type { Seat as SeatType, SeatUpdate } from '../types/index.js';
import { useSeatUpdates } from '../hooks/useSocket.js';
import { Seat } from './Seat.js';

interface SeatMapProps {
  eventId: string;
  seats: SeatType[];
  selectedSeats: string[];
  onSelectSeat: (seatCode: string, price: number, seatId: string) => Promise<void>;
  onDeselectSeat: (seatCode: string) => void;
  isLoading?: boolean;
}

/**
 * SeatMap Component
 * Displays an interactive grid of seats for event booking
 * Updates in real-time via WebSocket
 */
export const SeatMap: React.FC<SeatMapProps> = ({
  eventId,
  seats,
  selectedSeats,
  onSelectSeat,
  onDeselectSeat,
  isLoading = false,
}) => {
  const [localSeats, setLocalSeats] = useState<SeatType[]>(seats);
  const [holdCountdowns, setHoldCountdowns] = useState<{ [key: string]: number }>({});

  // Handle real-time seat updates from WebSocket
  useSeatUpdates(eventId, (update: SeatUpdate) => {
    setLocalSeats((prev) =>
      prev.map((seat) =>
        seat.seat_code === update.seatCode
          ? { ...seat, status: update.status }
          : seat
      )
    );
  });

  // Update local seats when props change
  useEffect(() => {
    setLocalSeats(seats);
  }, [seats]);

  // Handle hold expiration countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setHoldCountdowns((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] -= 1;
          if (updated[key] <= 0) {
            delete updated[key];
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Organize seats by rows (A-Z)
  const seatsByRow = useMemo(() => {
    const rows: { [key: string]: SeatType[] } = {};
    localSeats.forEach((seat) => {
      const row = seat.seat_code.charAt(0);
      if (!rows[row]) rows[row] = [];
      rows[row].push(seat);
    });

    // Sort by row letter and seat number
    Object.keys(rows).forEach((row) => {
      rows[row].sort((a, b) => {
        const numA = parseInt(a.seat_code.substring(1));
        const numB = parseInt(b.seat_code.substring(1));
        return numA - numB;
      });
    });

    return rows;
  }, [localSeats]);

  const handleSelectSeat = async (seat: SeatType) => {
    if (seat.status !== 'AVAILABLE') return;

    try {
      await onSelectSeat(seat.seat_code, seat.price, seat.id);

      // Start countdown for this seat's hold
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      setHoldCountdowns((prev) => ({
        ...prev,
        [seat.seat_code]: Math.floor((expiresAt - Date.now()) / 1000),
      }));
    } catch (error) {
      console.error('Failed to select seat:', error);
    }
  };

  const handleDeselectSeat = (seat: SeatType) => {
    onDeselectSeat(seat.seat_code);
    setHoldCountdowns((prev) => {
      const updated = { ...prev };
      delete updated[seat.seat_code];
      return updated;
    });
  };

  const stats = useMemo(() => {
    const available = localSeats.filter((s) => s.status === 'AVAILABLE').length;
    const held = localSeats.filter((s) => s.status === 'HOLD').length;
    const sold = localSeats.filter((s) => s.status === 'SOLD').length;
    return { available, held, sold, total: localSeats.length };
  }, [localSeats]);

  return (
    <div className="w-full space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Còn trống</p>
          <p className="text-2xl font-bold text-blue-600">{stats.available}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-600">Đang giữ</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.held}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Đã bán</p>
          <p className="text-2xl font-bold text-green-600">{stats.sold}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Tổng ghế</p>
          <p className="text-2xl font-bold text-gray-600">{stats.total}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded border-2 border-blue-600"></div>
          <span>Còn trống</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded border-2 border-yellow-600"></div>
          <span>Đang giữ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded border-2 border-green-600"></div>
          <span>Đã bán</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-500 rounded border-2 border-purple-600"></div>
          <span>Đã chọn</span>
        </div>
      </div>

      {/* Seat Grid */}
      <div className="overflow-x-auto bg-white p-6 rounded-lg border border-gray-200">
        <div className="inline-block min-w-full">
          {Object.entries(seatsByRow).map(([row, rowSeats]) => (
            <div key={row} className="flex items-center gap-2 mb-3">
              <span className="w-6 text-center font-bold text-gray-600 text-sm">
                {row}
              </span>
              <div className="flex gap-2">
                {rowSeats.map((seat) => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeats.includes(seat.seat_code)}
                    countdown={holdCountdowns[seat.seat_code]}
                    onSelect={() => handleSelectSeat(seat)}
                    onDeselect={() => handleDeselectSeat(seat)}
                    disabled={isLoading || seat.status !== 'AVAILABLE'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-sm text-blue-800">
          💡 Ghế được giữ trong 5 phút. Hãy hoàn thành thanh toán trước khi hết thời gian.
        </p>
      </div>
    </div>
  );
};

export default SeatMap;
