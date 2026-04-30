# 🎟️ Ticket Booking Backend - High-Concurrency System

A robust and scalable backend API for a high-concurrency ticket booking system built with **Node.js**, **Express**, **PostgreSQL**, and **Socket.IO**.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Server](#running-the-server)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Real-time Seat Selection** - WebSocket-based live seat availability updates
- **High Concurrency Handling** - Optimized for handling multiple simultaneous bookings
- **User Authentication** - JWT-based authentication for secure user management
- **Seat Holding System** - Temporary seat reservations with auto-expiration
- **Payment Processing** - Checkout and booking confirmation
- **AI Integration** - Google Generative AI for intelligent features
- **Database Optimization** - Redis caching for improved performance
- **Event Management** - Create, retrieve, and manage ticket events
- **User Bookings** - Track user booking history

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.2.1
- **Database**: PostgreSQL 8.20.0
- **Cache/Session**: Redis 5.12.1
- **Real-time Communication**: Socket.IO 4.8.3
- **Authentication**: JWT (jsonwebtoken 9.0.3)
- **AI**: Google Generative AI 0.24.1
- **Language**: TypeScript 6.0.3
- **Development**: tsx, ts-node, nodemon

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher)
- **Redis** (v6 or higher)
- **Git**

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ticket-booking/Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Types

```bash
npm install --save-dev @types/node @types/express @types/postgres @types/socket.io @types/cors @types/jsonwebtoken @types/uuid
```

## 🔧 Environment Setup

### 1. Create `.env` File

Create a `.env` file in the Backend directory with the following variables:

```env
# Server Configuration
PORT=3000

# PostgreSQL Configuration
PG_USER=postgres
PG_PASSWORD=123456
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=ticket_booking_db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Google AI Configuration
GOOGLE_API_KEY=your_google_api_key_here
```

### 2. Database Setup

**Create PostgreSQL Database:**

```bash
createdb ticket_booking_db
```

**Run Database Initialization:**

The system will automatically create necessary tables on first run. Alternatively, you can seed the database:

```bash
npm run seed
```

### 3. Redis Configuration

Ensure Redis is running:

```bash
# On macOS with Homebrew
brew services start redis

# On Linux
sudo systemctl start redis-server

# Or run Redis via Docker
docker run -d -p 6379:6379 redis:latest
```

## ▶️ Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

Expected output:
```
🟢 Đã kết nối thành công với PostgreSQL!
🚀 Server đang lắng nghe tại http://localhost:3000
🔌 Socket.IO đang chạy trên ws://localhost:3000
```

### Production Mode

```bash
npm run build
npm start
```

## 📁 Project Structure

```
Backend/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── config/
│   │   ├── db.ts               # PostgreSQL connection pool
│   │   └── redis.ts            # Redis client configuration
│   ├── controllers/
│   │   ├── event.ts            # Event management controller
│   │   ├── user.ts             # User authentication controller
│   │   └── reservation.ts      # Booking and reservation controller
│   ├── routes/
│   │   ├── events.ts           # Event API routes
│   │   ├── users.ts            # User API routes
│   │   └── reservation.ts      # Reservation API routes
│   ├── services/
│   │   └── seatService.ts      # Seat management service
│   ├── utils/
│   │   ├── app-error.ts        # Custom error handling
│   │   └── auth-middleware.ts  # JWT authentication middleware
│   └── scripts/
│       ├── seed.ts             # Database seeding script
│       ├── optimize-db.ts      # Database optimization script
│       ├── event-agent.ts      # AI event generation (standard)
│       └── event-agent-ollama.ts # AI event generation (Ollama)
├── package.json
├── tsconfig.json
├── .env                         # Environment variables
└── README.md
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/users/register` | Register new user | ❌ |
| POST | `/api/users/login` | Login user | ❌ |
| GET | `/api/users/me` | Get current user profile | ✅ |

**Register Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

### Events

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/events` | Get all events | ❌ |
| POST | `/api/events` | Create new event | ❌ |
| GET | `/api/events/:id` | Get event details | ❌ |
| GET | `/api/events/:id/seats` | Get available seats | ❌ |
| GET | `/api/events/:id/stats` | Get event statistics | ❌ |

### Reservations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/reservations/hold` | Hold seat (temporary reserve) | ❌ |
| POST | `/api/reservations/checkout` | Complete booking | ❌ |
| GET | `/api/reservations/user/me` | Get user's bookings | ✅ |

**Hold Seat Request:**
```json
{
  "eventId": "event-uuid",
  "seatCode": "A1",
  "userId": "user-uuid"
}
```

**Checkout Request:**
```json
{
  "userId": "user-uuid",
  "reservationId": "reservation-uuid",
  "eventId": "event-uuid",
  "seatCode": "A1"
}
```

## 💾 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  total_seats INTEGER NOT NULL,
  available_seats INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Seats Table
```sql
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  seat_code VARCHAR(10) NOT NULL,
  price DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'available',
  held_by UUID REFERENCES users(id),
  held_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Reservations Table
```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_id UUID NOT NULL REFERENCES events(id),
  seat_id UUID NOT NULL REFERENCES seats(id),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Scripts

### Seed Database

Populate the database with sample events and seats:

```bash
npm run seed
```

### Optimize Database

Run database optimization and indexing:

```bash
npm run optimize-db
```

### Generate Events with AI

Generate events using Google Generative AI:

```bash
# Standard AI event generation
tsx src/scripts/event-agent.ts

# Using Ollama for local AI
tsx src/scripts/event-agent-ollama.ts
```

## 🏗️ Architecture

### Real-time Communication

The system uses **Socket.IO** for real-time seat availability updates:

```typescript
io.on('connection', (socket) => {
  // Client connected
  console.log(`Client connected: ${socket.id}`);
  
  // Broadcast seat updates
  socket.broadcast.emit('seat-status-changed', {
    eventId, seatCode, status
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
```

### High Concurrency Handling

- **Redis Caching** - Fast in-memory seat availability checks
- **Connection Pooling** - PostgreSQL connection pool for optimal resource usage
- **Seat Holding** - Temporary reservations with auto-expiration to prevent seat blocking
- **Optimistic Locking** - Prevent double-booking through atomic database operations

### Authentication Flow

1. User registers or logs in
2. Backend verifies credentials
3. JWT token is generated and returned
4. Token is stored in frontend and sent with each request
5. `authMiddleware` validates token on protected routes

## 📝 Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Test your changes**
   ```bash
   npm run dev
   ```

4. **Commit with meaningful messages**
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. **Push to repository**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**

### Code Style

- Use TypeScript for type safety
- Follow Express.js best practices
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Handle errors gracefully with custom error classes

## 🐛 Troubleshooting

### PostgreSQL Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running and credentials in `.env` are correct.

### Redis Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution**: Start Redis service or run Docker container.

### JWT Token Invalid

**Solution**: Ensure token is sent in request header:
```
Authorization: Bearer <your-jwt-token>
```

## 📞 Support

For issues and questions:

1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error logs and environment information

## 📄 License

This project is licensed under the ISC License.

---

**Last Updated**: April 2026

**Version**: 1.0.0

**Maintainers**: Development Team
