# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY tsconfig*.json ./
COPY webpack*.js ./
COPY static/ ./static/
COPY src/ ./src/
COPY index.html ./index.html

RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Copy built files and static assets
COPY --from=builder /app/dist/ ./dist/
COPY static/ ./static/

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
