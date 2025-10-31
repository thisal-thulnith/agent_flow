#!/bin/bash

# ================================================================
# Sales AI Agent - Local Development Startup Script
# ================================================================
# This script starts both backend and frontend servers locally
# ================================================================

echo "🚀 Starting Sales AI Agent Platform (Local Development)"
echo "================================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend port is available
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 8000 is already in use. Stopping existing process...${NC}"
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Check if frontend port is available
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 5173 is already in use. Stopping existing process...${NC}"
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    sleep 2
fi

echo ""
echo -e "${BLUE}📦 Starting Backend Server...${NC}"
echo "================================================================"

# Start backend in background
cd backend
source venv/bin/activate
nohup python main.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo "   Backend URL: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Logs: logs/backend.log"

# Wait for backend to be ready
echo ""
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is responding
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy and ready!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may still be starting...${NC}"
fi

echo ""
echo -e "${BLUE}🎨 Starting Frontend Server...${NC}"
echo "================================================================"

# Start frontend in background
cd ../frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "   Frontend URL: http://localhost:5173"
echo "   Logs: logs/frontend.log"

# Wait for frontend to be ready
echo ""
echo "⏳ Waiting for frontend to initialize..."
sleep 3

# Check if frontend is responding
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is ready!${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be starting...${NC}"
fi

echo ""
echo "================================================================"
echo -e "${GREEN}🎉 Sales AI Agent Platform is running!${NC}"
echo "================================================================"
echo ""
echo "📌 Access your application:"
echo "   🌐 Frontend:  http://localhost:5173"
echo "   🔧 Backend:   http://localhost:8000"
echo "   📖 API Docs:  http://localhost:8000/docs"
echo ""
echo "📊 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 View logs:"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   Run: ./stop-local.sh"
echo "   Or:  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "================================================================"

# Save PIDs to file for easy stopping
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

echo -e "${BLUE}💡 Tip: Keep this terminal open to see the startup info${NC}"
echo -e "${BLUE}    Use 'tail -f logs/backend.log' to monitor backend${NC}"
echo -e "${BLUE}    Use 'tail -f logs/frontend.log' to monitor frontend${NC}"
echo ""
