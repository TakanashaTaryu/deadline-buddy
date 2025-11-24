# Use Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ curl

# Copy package.json and package-lock.json
COPY Backend/package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY Backend/ ./

# Create logs and data directories
RUN mkdir -p logs data

# Expose port
EXPOSE 5555

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5555/health || exit 1

# Start the application with hot-reload (development)
CMD ["npm", "run", "dev"]
