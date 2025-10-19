#!/bin/bash

echo "🚀 Starting We3Chat (FREE Setup)..."
echo "=================================="

# Function to check if a command is running
is_running() {
    pgrep -f "$1" > /dev/null
}

# Start IPFS daemon
echo "📡 Starting IPFS daemon..."
if ! is_running "ipfs daemon"; then
    ipfs daemon &
    sleep 3
    echo "✅ IPFS daemon started"
else
    echo "✅ IPFS daemon already running"
fi

# Start PostgreSQL
echo "🗄️  Starting PostgreSQL..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start postgresql
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql
fi
echo "✅ PostgreSQL started"

# Start backend server
echo "🔧 Starting backend server..."
cd backend-local
if ! is_running "node server.js"; then
    node server.js &
    sleep 2
    echo "✅ Backend server started"
else
    echo "✅ Backend server already running"
fi
cd ..

# Start frontend
echo "🌐 Starting frontend..."
npm run dev

echo "🎉 We3Chat is now running!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo "IPFS: http://localhost:5001"
