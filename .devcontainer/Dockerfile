FROM node:22-slim

RUN npm install -g pnpm

RUN apt-get update && apt-get install -y \
    sudo \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright Chromium with system dependencies
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
RUN npx playwright@1.58.2 install --with-deps chromium

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

# Set up non-root user
USER node
