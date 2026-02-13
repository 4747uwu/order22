# 🔧 PRODUCTION: backend/Dockerfile
FROM node:22-bookworm-slim AS base

# Install essential tools AND complete Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    dcmtk \
    git \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    libasound2 \
    libxkbcommon0 \
    libcairo2 \
    libpango-1.0-0 \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Create non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

# ✅ NEW: Create shared temp directory with proper permissions
RUN mkdir -p /tmp/node/restore && \
    chown -R nodejs:nodejs /tmp/node/restore && \
    chmod -R 755 /tmp/node/restore

# Create cache directory and set ownership
RUN mkdir -p /home/nodejs/.cache/puppeteer && \
    chown -R nodejs:nodejs /home/nodejs

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_CACHE_DIR=/home/nodejs/.cache/puppeteer

# Install npm packages
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Install Chrome and set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs
RUN npx puppeteer browsers install chrome

# Switch back to WORKDIR as nodejs user
WORKDIR /app

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"]