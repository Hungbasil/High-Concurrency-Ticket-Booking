# 🎫 Ticket Booking System - High-Concurrency Event Management

A modern, production-ready ticket booking platform built with **React**, **TypeScript**, **Express.js**, **PostgreSQL**, and **Socket.IO**. Designed to handle high-concurrency scenarios with real-time seat management and AI-powered booking assistance.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-green)
![Real-time](https://img.shields.io/badge/Real--time-WebSocket-orange)
![Database](https://img.shields.io/badge/Database-PostgreSQL%2BRedis-9C27B0)

---

## ✨ Key Features

### 🎯 Core Features
- **Real-time Seat Management**: Live seat availability with WebSocket updates
- **Concurrent Booking**: Handle thousands of simultaneous bookings without race conditions
- **5-Minute Hold Window**: Automatic seat release after 5 minutes if not purchased
- **Payment Integration**: Simulated checkout flow with transaction safety
- **AI-Powered Booking**: Auto-booking suggestions with Google Generative AI or local Ollama models

### 🔒 Security Features
- **Enterprise-Grade Password Hashing**: bcrypt with 12 salt rounds (replacing insecure SHA256)
- **JWT Authentication**: Secure token-based auth with required environment variables
- **Rate Limiting**: Brute-force protection on auth endpoints (5 attempts per 15 minutes)
- **CORS Protection**: Strict origin validation
- **Helmet Security Headers**: Protection against XSS, clickjacking, and other header-based attacks
- **Input Validation**: Strict schema validation on all endpoints

### ⚡ Performance Features
- **Redis Caching**: Distributed rate limiting and seat locking
- **Connection Pooling**: Optimized PostgreSQL connection management (20 concurrent connections)
- **Cleanup Jobs**: Automatic background task to release expired reservations every 30 seconds
- **Transaction Safety**: All critical operations use database transactions to prevent data loss

### 🎨 Frontend Features
- **Modern UI**: Built with React 19 + TailwindCSS
- **Real-time Updates**: Live seat color changes via WebSocket
- **Responsive Design**: Mobile-first approach
- **Form Validation**: Client-side and server-side validation
- **Smooth UX**: Loading states, notifications, error handling

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 12+
- Redis 6+
- (Optional) Ollama for local AI models

### Backend Setup

```bash
cd Backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and set required values (JWT_SECRET is mandatory!)
# Generate JWT_SECRET: openssl rand -base64 32
nano .env

# Run database migrations (if applicable)
# npm run migrate

# Seed test data
npm run seed

# Start development server
npm run dev
```

**Backend runs on**: `http://localhost:3000`

### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

**Frontend runs on**: `http://localhost:5173`

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, TailwindCSS, Socket.IO Client |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL, Redis |
| **Real-time** | Socket.IO for WebSocket communication |
| **AI** | Google Generative AI / Ollama (optional) |
| **Security** | bcrypt, JWT, Helmet, Rate Limiting |

### Database Schema

```
users
├── id (UUID)
├── email (unique)
├── password_hash (bcrypt)
├── full_name
└── created_at

events
├── id (UUID)
├── title
├── start_time
├── status
└── created_at

seats
├── id (UUID)
├── event_id (foreign key)
├── seat_code (A1, A2, B1, etc.)
├── price
├── status (AVAILABLE, HOLD, SOLD)
└── created_at

reservations
├── id (UUID)
├── user_id (nullable for temp bookings)
├── seat_id (foreign key)
├── status (PENDING, PAID, CANCELLED)
├── expires_at (5 minutes from creation)
├── created_at
└── updated_at
```

### System Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Client (React App)                     │
├─────────────────────────────────────────────────────────┤
│  • Browse events  • Select seats  • Checkout  • History  │
└──────┬──────────────────────────────────┬────────────────┘
       │ REST API + WebSocket             │
       ▼                                   ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Express.js)                        │
├─────────────────────────────────────────────────────────┤
│  • Authentication & Authorization                        │
│  • Seat locking (Redis)                                  │
│  • Transaction management                               │
│  • Real-time socket events                              │
└──────┬──────────────────────────────────┬────────────────┘
       │                                   │
       ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│   PostgreSQL     │              │     Redis        │
│   (Main DB)      │              │  (Distributed    │
│                  │              │   Locks & Cache) │
└──────────────────┘              └──────────────────┘

Background Job (every 30 seconds):
  → Cleanup expired holds
  → Release seats back to AVAILABLE
```

---

## 🔐 Security Highlights

### Fixed Issues

| Issue | Solution |
|-------|----------|
| ❌ Weak Password Hashing (SHA256) | ✅ bcrypt with 12 rounds + uppercase/number requirement |
| ❌ Hardcoded JWT Secret | ✅ Mandatory environment variable, error on startup if missing |
| ❌ No Security Headers | ✅ Helmet middleware enabled |
| ❌ No Auth Rate Limiting | ✅ 5 attempts per 15 minutes on login/register |
| ❌ userId from Request Body | ✅ Extracted from JWT token only |
| ❌ WebSocket Memory Leak | ✅ Proper cleanup on component unmount |
| ❌ Race Conditions | ✅ Proper async/await handling, Promise.all for transactions |

### Password Requirements
- **Minimum 8 characters** (previously 6)
- **At least 1 uppercase letter** (A-Z)
- **At least 1 number** (0-9)

Example valid passwords:
- ✅ `SecurePass123`
- ✅ `MyEvent2025!`
- ❌ `password` (no uppercase/number)
- ❌ `Pass1` (too short)

---

## 📋 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe"
}

Response (201):
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2026-04-29T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response (200): Same as register
```

**Rate Limit**: 5 requests per 15 minutes per IP

---

### Event Endpoints

#### Get All Events
```http
GET /api/events

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Sky Tour 2026 - M-TP",
      "start_time": "2026-05-10T...",
      "status": "ON_SALE",
      "totalSeats": 5000,
      "availableSeats": 4850
    }
  ]
}
```

#### Get Event Details with Seats
```http
GET /api/events/:eventId

Response (200):
{
  "success": true,
  "data": {
    "event": {...},
    "seats": [
      {
        "id": "uuid",
        "seat_code": "A1",
        "price": 3000000,
        "status": "AVAILABLE"
      }
    ]
  }
}
```

---

### Reservation Endpoints

#### Hold a Seat (5-minute lock)
```http
POST /api/reservations/hold
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventId": "uuid",
  "seatCode": "A1"
}

Response (200):
{
  "message": "Giữ ghế thành công! Bạn có 5 phút để thanh toán.",
  "reservationId": "uuid",
  "expiresAt": "2026-04-29T10:35:00Z"
}
```

#### Complete Checkout (Purchase)
```http
POST /api/reservations/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "reservationId": "uuid",
  "eventId": "uuid",
  "seatCode": "A1"
}

Response (200):
{
  "message": "✅ Thanh toán thành công!"
}
```

#### Get User Bookings
```http
GET /api/reservations/user/me
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "reservation_id": "uuid",
      "status": "PAID",
      "seat_code": "A1",
      "price": 3000000,
      "event_id": "uuid",
      "title": "Sky Tour 2026",
      "start_time": "2026-05-10T..."
    }
  ]
}
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=3000
NODE_ENV=development

# Database
PG_USER=postgres
PG_PASSWORD=your_password
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=ticket_booking_db

# Redis
REDIS_URL=redis://localhost:6379

# Security (REQUIRED)
JWT_SECRET=your-very-secure-secret-min-32-chars

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional
GOOGLE_API_KEY=your_api_key
OLLAMA_URL=http://localhost:11434/api/chat
```

#### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
VITE_APP_ENV=development
VITE_ENABLE_AI_BOOKING=true
```

---

## 📊 Database Setup

### PostgreSQL Initialization

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ticket_booking_db;

# Connect to database
\c ticket_booking_db

# Run seed to create tables and sample data
npm run seed
```

### Table Creation SQL
See `Backend/src/scripts/seed.ts` for the complete schema.

---

## 🧪 Testing

### Backend Tests
```bash
cd Backend
npm run test
```

### Frontend Tests
```bash
cd Frontend
npm run test
npm run test:ui
```

### E2E Tests (Cypress)
```bash
cd Frontend
npm run cypress:open  # Interactive mode
npm run cypress:run   # Headless mode
```

---

## 📈 Performance Optimization

### Current Optimizations
- ✅ Database connection pooling (max 20 connections)
- ✅ Redis distributed locking for seat selection
- ✅ WebSocket for real-time updates (vs polling)
- ✅ Transaction batching with `Promise.all()`
- ✅ Background cleanup job (non-blocking)
- ✅ Index optimization on `expires_at` column

### Scaling Recommendations
1. **Horizontal Scaling**: Use load balancer (Nginx/HAProxy) with multiple backend instances
2. **Database**: Add read replicas for event/seat queries
3. **Cache**: Implement Redis caching for frequently accessed events
4. **CDN**: Serve static assets from CDN for faster frontend delivery
5. **Monitoring**: Add APM tools (Datadog, New Relic) for performance tracking

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check JWT_SECRET is set
echo $JWT_SECRET

# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Verify Redis is running
redis-cli ping

# Clear node_modules and reinstall
rm -rf node_modules && npm install
npm run dev
```

### Seats not updating in real-time
1. Check WebSocket connection in browser DevTools → Network → WS
2. Verify Socket.IO is running: `http://localhost:3000/socket.io/`
3. Check browser console for errors

### "Too many requests" error
- Wait 15 minutes or flush Redis:
```bash
redis-cli FLUSHALL
```

### Database connection errors
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection parameters in .env
psql -U postgres -h localhost -d ticket_booking_db
```

---

## 📚 Project Structure

```
ticket-booking/
├── Backend/
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── config/               # DB, Redis configs
│   │   ├── controllers/          # Business logic
│   │   ├── routes/               # API endpoints
│   │   ├── services/             # Seat management
│   │   ├── utils/                # Middleware, validators
│   │   └── scripts/              # Seed, migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── Frontend/
│   ├── src/
│   │   ├── pages/                # Page components
│   │   ├── components/           # Reusable components
│   │   ├── hooks/                # Custom hooks
│   │   ├── api/                  # API client
│   │   ├── store/                # State management
│   │   ├── types/                # TypeScript types
│   │   └── utils/                # Utilities
│   ├── cypress/                  # E2E tests
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.local
│
└── README.md                     # This file
```

---

## 🚢 Deployment

### Docker Deployment

#### Backend Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### Build & Run
```bash
docker build -t ticket-booking-backend .
docker run -p 3000:3000 \
  -e JWT_SECRET="your-secret" \
  -e PG_PASSWORD="your-password" \
  ticket-booking-backend
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Generate secure JWT_SECRET (`openssl rand -base64 32`)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS with production domain
- [ ] Set up database backups
- [ ] Enable Redis persistence
- [ ] Configure monitoring & alerting
- [ ] Enable rate limiting
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging aggregation

---

## 📞 Support & Documentation

### Documentation
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Socket.IO Docs](https://socket.io/docs/)

### Common Issues
See **Troubleshooting** section above for solutions.

---

## 📝 License

MIT License - Feel free to use this project for personal or commercial purposes.

---

## 🎯 Future Enhancements

- [ ] Payment gateway integration (Stripe, PayPal)
- [ ] Email notifications for bookings
- [ ] Analytics dashboard for event organizers
- [ ] Refund management system
- [ ] Group booking discounts
- [ ] QR code ticket generation
- [ ] Mobile app (React Native)
- [ ] Admin panel for event management
- [ ] Waitlist functionality
- [ ] Multi-language support (i18n)

---

## 🙏 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Last Updated**: April 29, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
