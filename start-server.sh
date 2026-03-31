#!/bin/bash

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "Redis is not installed. Installing Redis..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        sudo apt-get update
        sudo apt-get install -y redis-server
        sudo systemctl enable redis-server
        sudo systemctl start redis-server
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        brew install redis
        brew services start redis
    else
        echo "Unsupported OS for automatic Redis installation."
        echo "Please install Redis manually and try again."
        exit 1
    fi
fi

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis server..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start redis-server
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis
    else
        # Generic start command as fallback
        redis-server --daemonize yes
    fi
fi

# Check if .env file exists, create it if it doesn't
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Server Configuration
PORT=3001

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Settings
NODE_ENV=development
EOF
fi

# Start the application
echo "Starting school management system with Redis..."
npm run start 