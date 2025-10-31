# 🚀 Local Development Setup

This guide will help you run the Sales AI Agent platform locally on your machine.

---

## 📋 Prerequisites

Make sure you have the following installed:

- **Python 3.11+** (for backend)
- **Node.js 18+** (for frontend)
- **PostgreSQL** (Supabase database)
- **Git**

---

## ⚡ Quick Start (Easiest Way)

### 1. Start Both Servers

```bash
./start-local.sh
```

This will automatically:
- Start the backend server on http://localhost:8000
- Start the frontend server on http://localhost:5173
- Check health status
- Save process IDs for easy stopping

### 2. Stop Both Servers

```bash
./stop-local.sh
```

---

## 🔧 Manual Setup (If You Need More Control)

### Backend Server

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate

# Start the server
python main.py
```

The backend will run on **http://localhost:8000**

### Frontend Server

```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev
```

The frontend will run on **http://localhost:5173**

---

## 🌐 Access Points

Once both servers are running:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main application UI |
| **Backend API** | http://localhost:8000 | REST API server |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation (Swagger) |
| **Health Check** | http://localhost:8000/health | Server health status |

---

## 📝 View Logs

### Backend Logs
```bash
tail -f logs/backend.log
```

### Frontend Logs
```bash
tail -f logs/frontend.log
```

---

## 🔍 Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

```bash
# Kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Backend Not Starting

1. Check if Python virtual environment is activated
2. Verify all environment variables in `backend/.env`
3. Check database connection (Supabase)
4. View backend logs: `tail -f logs/backend.log`

### Frontend Not Starting

1. Make sure Node.js is installed
2. Run `npm install` in frontend directory
3. Check frontend logs: `tail -f logs/frontend.log`

### CORS Errors

If you see CORS errors in the browser console:
- Backend CORS is configured to allow all origins
- Make sure frontend is using `http://localhost:8000` as API URL
- Check `frontend/.env` file

---

## 📦 Environment Configuration

### Backend (.env)

Located at `backend/.env`:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Qdrant
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key

# Firebase (Optional for DEV mode)
FIREBASE_CREDENTIALS_PATH=path_to_credentials.json

# Environment
ENVIRONMENT=development
PORT=8000
```

### Frontend (.env)

Located at `frontend/.env`:

```env
# Backend API
VITE_API_URL=http://localhost:8000

# Firebase
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🧪 Testing the Setup

### 1. Test Backend Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"success":true,"status":"healthy","environment":"development"}
```

### 2. Test Frontend

Open your browser and navigate to:
```
http://localhost:5173
```

You should see the login page.

### 3. Test Full Flow

1. Go to http://localhost:5173
2. Sign up or log in
3. Create a new agent
4. Test the chat functionality
5. Check the dashboard

---

## 🔄 Hot Reload (Development)

Both servers support hot reload:

### Backend
- **Uvicorn** automatically reloads when you modify Python files
- Just save your file and changes will apply

### Frontend
- **Vite** automatically reloads when you modify React files
- Changes appear instantly in the browser

---

## 📂 Project Structure

```
sales_agent/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application entry
│   ├── routers/            # API route handlers
│   ├── agents/             # AI agent logic
│   ├── database/           # Database models & helpers
│   └── .env                # Backend environment variables
├── frontend/               # React frontend
│   ├── src/                # Source files
│   ├── public/             # Static assets
│   └── .env                # Frontend environment variables
├── logs/                   # Application logs
│   ├── backend.log         # Backend server logs
│   └── frontend.log        # Frontend server logs
├── start-local.sh          # Quick start script
├── stop-local.sh           # Quick stop script
└── LOCAL_DEVELOPMENT.md    # This file
```

---

## 🛠️ Development Commands

### Backend Commands

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run tests (if available)
pytest

# Format code
black .

# Check code quality
flake8
```

### Frontend Commands

```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

---

## 🚢 Production Deployment

### Backend (Current: ngrok)
The backend is currently tunneled through ngrok: https://8275782ae12f.ngrok-free.app

For permanent deployment, consider:
- Railway
- Render
- Google Cloud Run
- AWS EC2

### Frontend (Netlify)
The frontend is deployed at: https://cozy-meringue-0feda7.netlify.app

To deploy updates:
```bash
cd frontend
netlify deploy --prod
```

---

## 💡 Tips

1. **Keep Both Terminals Open**: Run backend and frontend in separate terminal windows to see real-time logs

2. **Use API Docs**: Visit http://localhost:8000/docs to test API endpoints interactively

3. **Check Logs Often**: If something isn't working, check the logs first

4. **Database Migrations**: If you update database schema, you may need to run migrations in Supabase

5. **Clear Cache**: If you see stale data, try clearing browser cache or hard refresh (Cmd/Ctrl + Shift + R)

---

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `tail -f logs/backend.log` or `tail -f logs/frontend.log`
2. Verify environment variables are set correctly
3. Make sure all services (Supabase, OpenAI, Qdrant) are accessible
4. Try restarting both servers: `./stop-local.sh && ./start-local.sh`

---

## ✅ Checklist for First Time Setup

- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Backend `.env` file configured
- [ ] Frontend `.env` file configured
- [ ] Backend virtual environment created
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Supabase database accessible
- [ ] OpenAI API key working
- [ ] Qdrant vector database accessible
- [ ] Firebase credentials configured
- [ ] Both servers can start without errors

---

**Happy Coding! 🚀**
