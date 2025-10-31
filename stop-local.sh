#!/bin/bash

# ================================================================
# Sales AI Agent - Stop Local Development Servers
# ================================================================

echo "🛑 Stopping Sales AI Agent Platform..."
echo "================================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop backend
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID
        sleep 2
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "Force killing backend..."
            kill -9 $BACKEND_PID
        fi
        echo -e "${GREEN}✅ Backend stopped${NC}"
    else
        echo "Backend process not found"
    fi
    rm .backend.pid
else
    # Try to kill by port
    if lsof -ti:8000 > /dev/null 2>&1; then
        echo "Stopping backend on port 8000..."
        lsof -ti:8000 | xargs kill -9
        echo -e "${GREEN}✅ Backend stopped${NC}"
    else
        echo "Backend not running"
    fi
fi

# Stop frontend
if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID
        sleep 2
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "Force killing frontend..."
            kill -9 $FRONTEND_PID
        fi
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    else
        echo "Frontend process not found"
    fi
    rm .frontend.pid
else
    # Try to kill by port
    if lsof -ti:5173 > /dev/null 2>&1; then
        echo "Stopping frontend on port 5173..."
        lsof -ti:5173 | xargs kill -9
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    else
        echo "Frontend not running"
    fi
fi

# Also kill any stray vite or python processes
pkill -f "vite" 2>/dev/null
pkill -f "python main.py" 2>/dev/null

echo ""
echo "================================================================"
echo -e "${GREEN}✅ All servers stopped!${NC}"
echo "================================================================"
