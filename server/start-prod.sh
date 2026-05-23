#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Mochan Labs Admin Server (Production)${NC}"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo -e "${BLUE}📋 Please create .env.production with the following variables:${NC}"
    echo "MONGODB_URI=..."
    echo "GMAIL_USER=..."
    echo "GMAIL_APP_PASSWORD=..."
    echo "NODE_ENV=production"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ npm install failed${NC}"
        exit 1
    fi
fi

# Create logs directory
if [ ! -d "logs" ]; then
    mkdir logs
    echo -e "${GREEN}✅ Created logs directory${NC}"
fi

# Stop existing PM2 process
echo -e "${BLUE}🛑 Stopping existing PM2 processes...${NC}"
pm2 stop mochan-admin 2>/dev/null

# Start with PM2
echo -e "${BLUE}🚀 Starting with PM2...${NC}"
pm2 start ecosystem.config.js --env production --update-env

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server started successfully!${NC}"
    echo -e "${BLUE}📊 Saving PM2 process list...${NC}"
    pm2 save
    echo -e "${GREEN}✅ Production server is running${NC}"
    echo -e "${BLUE}📋 Logs location: ./logs/${NC}"
    echo -e "${BLUE}📊 Monitor with: pm2 monit${NC}"
else
    echo -e "${RED}❌ Failed to start server${NC}"
    exit 1
fi
