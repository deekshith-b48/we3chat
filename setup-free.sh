#!/bin/bash

# We3Chat FREE Setup Script
# This script sets up We3Chat using only free and open-source tools

set -e

echo "🚀 We3Chat FREE Setup Starting..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running on supported OS
if [[ "$OSTYPE" != "linux-gnu"* ]] && [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script only supports Linux and macOS"
    exit 1
fi

print_info "Detected OS: $OSTYPE"

# Step 1: Install Node.js dependencies
print_info "Step 1: Installing Node.js dependencies..."
npm install --legacy-peer-deps
print_status "Node.js dependencies installed"

# Step 2: Install IPFS globally
print_info "Step 2: Installing IPFS globally..."
if command -v ipfs &> /dev/null; then
    print_status "IPFS already installed"
else
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        wget https://dist.ipfs.io/go-ipfs/v0.18.0/go-ipfs_v0.18.0_linux-amd64.tar.gz
        tar -xzf go-ipfs_v0.18.0_linux-amd64.tar.gz
        sudo mv go-ipfs/ipfs /usr/local/bin/
        rm -rf go-ipfs go-ipfs_v0.18.0_linux-amd64.tar.gz
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew &> /dev/null; then
            brew install ipfs
        else
            print_warning "Homebrew not found. Please install IPFS manually from https://ipfs.io/docs/install/"
        fi
    fi
    print_status "IPFS installed"
fi

# Step 3: Install PostgreSQL
print_info "Step 3: Installing PostgreSQL..."
if command -v psql &> /dev/null; then
    print_status "PostgreSQL already installed"
else
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install postgresql
        else
            print_warning "Homebrew not found. Please install PostgreSQL manually from https://www.postgresql.org/download/"
        fi
    fi
    print_status "PostgreSQL installed"
fi

# Step 4: Setup PostgreSQL database
print_info "Step 4: Setting up PostgreSQL database..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql
fi

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE we3chat;" 2>/dev/null || print_warning "Database might already exist"
sudo -u postgres psql -c "CREATE USER we3chat WITH PASSWORD 'password';" 2>/dev/null || print_warning "User might already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE we3chat TO we3chat;" 2>/dev/null || print_warning "Privileges might already be granted"
print_status "PostgreSQL database setup complete"

# Step 5: Initialize IPFS
print_info "Step 5: Initializing IPFS..."
if [ ! -d "$HOME/.ipfs" ]; then
    ipfs init
    print_status "IPFS initialized"
else
    print_status "IPFS already initialized"
fi

# Step 6: Install backend dependencies
print_info "Step 6: Installing backend dependencies..."
cd backend-local
npm install
cd ..
print_status "Backend dependencies installed"

# Step 7: Create environment files
print_info "Step 7: Creating environment files..."
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
# Application
NEXT_PUBLIC_APP_NAME=We3Chat
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Blockchain Configuration (FREE)
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CHAT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=free

# Local Database (FREE)
DATABASE_URL=postgresql://we3chat:password@localhost:5432/we3chat
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_ANON_KEY=local_anon_key

# Local IPFS (FREE)
NEXT_PUBLIC_IPFS_HTTP_URL=http://localhost:5001/api/v0
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=not_needed

# Real-time Messaging (FREE)
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_REALTIME_SERVER_URL=http://localhost:3001

# Security (Generate locally)
NEXT_PUBLIC_ENCRYPTION_KEY=local_encryption_key_12345
NEXT_PUBLIC_JWT_SECRET=local_jwt_secret_67890

# Development
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true
EOF
    print_status "Environment file created"
else
    print_warning "Environment file already exists"
fi

# Step 8: Install OpenZeppelin contracts
print_info "Step 8: Installing OpenZeppelin contracts..."
npm install @openzeppelin/contracts
print_status "OpenZeppelin contracts installed"

# Step 9: Compile smart contracts
print_info "Step 9: Compiling smart contracts..."
npm run contract:compile
print_status "Smart contracts compiled"

# Step 10: Create startup scripts
print_info "Step 10: Creating startup scripts..."

# Create start script
cat > start-free.sh << 'EOF'
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
EOF

chmod +x start-free.sh

# Create stop script
cat > stop-free.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping We3Chat (FREE Setup)..."
echo "=================================="

# Stop IPFS daemon
echo "📡 Stopping IPFS daemon..."
pkill -f "ipfs daemon" || echo "IPFS daemon not running"

# Stop backend server
echo "🔧 Stopping backend server..."
pkill -f "node server.js" || echo "Backend server not running"

# Stop PostgreSQL
echo "🗄️  Stopping PostgreSQL..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl stop postgresql
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew services stop postgresql
fi

echo "✅ All services stopped"
EOF

chmod +x stop-free.sh

print_status "Startup scripts created"

# Step 11: Final instructions
echo ""
echo "🎉 We3Chat FREE Setup Complete!"
echo "================================"
echo ""
print_info "To start We3Chat, run:"
echo "  ./start-free.sh"
echo ""
print_info "To stop We3Chat, run:"
echo "  ./stop-free.sh"
echo ""
print_info "Services will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo "  IPFS:     http://localhost:5001"
echo ""
print_info "Database connection:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: we3chat"
echo "  Username: we3chat"
echo "  Password: password"
echo ""
print_warning "Make sure to:"
echo "  1. Connect your MetaMask wallet"
echo "  2. Switch to Polygon Amoy testnet"
echo "  3. Get test MATIC from https://faucet.polygon.technology/"
echo ""
print_status "Setup complete! Run './start-free.sh' to begin."
