import React from 'react';
import type { Event } from '../types/index.js';
import { Link } from 'react-router-dom';

interface EventCardProps {
  event: Event;
  stats?: {
    availableCount: number;
    soldCount: number;
  };
}

/**
 * Event Card Component
 */
export const EventCard: React.FC<EventCardProps> = ({ event, stats }) => {
  const eventDate = new Date(event.start_time);
  const timeStr = eventDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-40 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-4xl font-bold">{eventDate.getDate()}</p>
          <p className="text-sm">
            {eventDate.toLocaleString('vi-VN', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 truncate mb-2">
          {event.title}
        </h3>

        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-600">
            🕐 {timeStr}
          </p>
          {stats && (
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-600">Còn trống:</span>{' '}
                <span className="font-semibold text-blue-600">
                  {stats.availableCount}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Đã bán:</span>{' '}
                <span className="font-semibold text-green-600">
                  {stats.soldCount}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
            {event.status}
          </span>
          <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors">
            Xem chi tiết
          </button>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
