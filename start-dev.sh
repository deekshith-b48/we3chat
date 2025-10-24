#!/bin/bash

# We3Chat Development Startup Script
# Starts both backend and frontend in development mode

echo "🚀 Starting We3Chat Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo -e "${BLUE}📋 Checking dependencies...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are available${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the We3Chat root directory${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Create .env files if they don't exist
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}📝 Creating frontend .env.local...${NC}"
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
EOF
fi

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}📝 Creating backend .env...${NC}"
    cat > backend/.env << EOF
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
MONGODB_URL=mongodb://localhost:27017/we3chat
JWT_SECRET=your_jwt_secret_here
ENABLE_BLOCKCHAIN_MESSAGING=true
ENABLE_IPFS_STORAGE=true
ENABLE_SIWE_AUTH=true
ENABLE_REAL_TIME_SYNC=true
LOG_LEVEL=info
LOG_FORMAT=pretty
EOF
fi

# Function to start backend
start_backend() {
    echo -e "${BLUE}🔧 Starting backend server...${NC}"
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}🎨 Starting frontend server...${NC}"
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Backend stopped${NC}"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start servers
start_backend

# Wait a moment for backend to start
sleep 3

start_frontend

echo -e "\n${GREEN}🎉 We3Chat is running!${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend: http://localhost:5000${NC}"
echo -e "${BLUE}🔌 WebSocket: ws://localhost:5000${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for user to stop
wait
