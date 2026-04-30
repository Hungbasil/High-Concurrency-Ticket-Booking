# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY Frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY Frontend/. .

# Build the application
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install a simple HTTP server to serve static files
RUN npm install -g http-server

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Create a .env file for production
RUN echo "VITE_API_BASE_URL=http://api.example.com/api" > .env.production

# Expose port
EXPOSE 5173

# Start the server
CMD ["http-server", "dist", "-p", "5173", "--cors", "-g"]
