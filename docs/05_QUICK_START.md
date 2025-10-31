# Quick Start Guide

Get your Sales AI Agent platform running in 30 minutes!

## Prerequisites

Make sure you have installed:
- ✅ Python 3.9 or higher
- ✅ Node.js 18 or higher
- ✅ Git

Check versions:
```bash
python --version  # Should be 3.9+
node --version    # Should be 18+
npm --version
```

## Step 1: Get All Credentials (15 minutes)

Follow these guides to get your free credentials:

1. **Supabase** (Database): [01_SETUP_SUPABASE.md](01_SETUP_SUPABASE.md) - 5 min
2. **Pinecone** (Vector DB): [02_SETUP_PINECONE.md](02_SETUP_PINECONE.md) - 3 min
3. **Firebase** (Auth): [03_SETUP_FIREBASE.md](03_SETUP_FIREBASE.md) - 5 min
4. **OpenAI** (AI): [04_SETUP_OPENAI.md](04_SETUP_OPENAI.md) - 2 min

## Step 2: Configure Environment (2 minutes)

### Backend Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your credentials:
```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# Pinecone
PINECONE_API_KEY=pcsk_xxxxx
PINECONE_ENVIRONMENT=gcp-starter
PINECONE_INDEX_NAME=sales-agents

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o-mini

# Firebase
FIREBASE_PROJECT_ID=your-project-id
```

### Frontend Configuration

1. Navigate to frontend and copy template:
```bash
cd frontend
cp .env.example .env
```

2. Edit `frontend/.env`:
```bash
VITE_API_URL=http://localhost:8000

VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc
```

## Step 3: Initialize Database (2 minutes)

1. Go to your Supabase Dashboard
2. Click **SQL Editor**
3. Copy contents of `backend/scripts/create_tables.sql`
4. Paste and click **Run**
5. Verify all 4 tables were created

## Step 4: Setup Backend (3 minutes)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # Mac/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# This will take 2-3 minutes...
```

## Step 5: Setup Frontend (3 minutes)

Open a **NEW terminal** (keep backend terminal open):

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# This will take 2-3 minutes...
```

## Step 6: Start Everything (1 minute)

### Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate  # if not already activated
python main.py
```

You should see:
```
🚀 Sales AI Agent Platform Starting...
✅ Configuration valid!
✅ Supabase connected successfully!
✅ Backend ready on http://localhost:8000
📖 API docs: http://localhost:8000/docs
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.0.12  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Step 7: Test It! (5 minutes)

### 7.1 Access the App

Open your browser: **http://localhost:5173**

### 7.2 Create Account

1. Click **"Sign Up"**
2. Enter email and password
3. Verify in Firebase Console > Authentication

### 7.3 Create Your First Agent

1. Click **"Create New Agent"**
2. Fill in:
   - **Name**: "Test Sales Agent"
   - **Company**: "Acme Inc"
   - **Description**: "We sell amazing widgets that solve problems"
   - **Products**: Add at least one product
3. Click **"Create Agent"**

### 7.4 Train Your Agent

1. Click on your agent
2. Go to **"Training"** tab
3. Try one of these:
   - Upload a PDF about your product
   - Add a website URL to scrape
   - Manually add FAQ items
4. Wait for processing (10-30 seconds)

### 7.5 Test Chat

1. Go to **"Test Chat"** tab
2. Ask questions like:
   - "What products do you offer?"
   - "How much does it cost?"
   - "Tell me more about your company"
3. Your agent should respond using the trained knowledge!

## Step 8: Get Embed Code

1. Go to **"Embed"** tab
2. Copy the embed code
3. Test it in a simple HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Agent</title>
</head>
<body>
    <h1>My Website</h1>

    <!-- Paste embed code here -->
    <script src="http://localhost:5173/widget.js"
            data-agent-id="your-agent-id">
    </script>
</body>
</html>
```

## Verification Checklist

✅ Backend running on port 8000
✅ Frontend running on port 5173
✅ Can sign up/login
✅ Can create an agent
✅ Can upload training data
✅ Can chat with agent
✅ Agent responds with trained knowledge

## Common Issues & Solutions

### "Module not found" - Python

```bash
# Make sure virtual environment is activated
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### "Cannot connect to Supabase"

1. Check `.env` has correct SUPABASE_URL and keys
2. Verify database tables exist (run SQL script again)
3. Test connection in Supabase dashboard

### "Pinecone index not found"

Don't worry! The index is created automatically when you first start the backend. Just wait a few seconds.

### "OpenAI API error"

1. Verify API key is correct
2. Check you have billing set up
3. Try a different model: `gpt-3.5-turbo`

### "Firebase auth not working"

1. Check all Firebase config values in `frontend/.env`
2. Verify Email/Password is enabled in Firebase Console
3. Check browser console for detailed errors

### Port already in use

```bash
# Backend (port 8000)
lsof -ti:8000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :8000   # Windows

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :5173   # Windows
```

## Next Steps

Now that everything is running:

1. **Customize your agent**: Adjust tone, strategy, greeting
2. **Add more training data**: PDFs, URLs, FAQs
3. **Test different scenarios**: See how agent handles objections
4. **Check analytics**: View conversations and leads
5. **Deploy to production**: See deployment guides

## Getting Help

- **Backend API Docs**: http://localhost:8000/docs
- **Check logs**: Both terminal windows show detailed logs
- **Supabase Dashboard**: View database records
- **Pinecone Dashboard**: See vector counts
- **Firebase Console**: Check auth users

## Development Tips

### Hot Reload

Both backend and frontend support hot reload:
- **Backend**: Edit any Python file, it restarts automatically
- **Frontend**: Edit any React file, browser updates instantly

### Debug Mode

Enable verbose logging:

**Backend** - Edit `backend/main.py`:
```python
uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=settings.PORT,
    reload=True,
    log_level="debug"  # Add this
)
```

**Frontend** - Check browser console (F12)

### Database Inspection

View data directly:
- **Supabase**: Dashboard > Table Editor
- **Pinecone**: Dashboard > Indexes > Browse

### Testing API Directly

Use the Swagger UI: http://localhost:8000/docs
- Try all endpoints
- See request/response formats
- No need for frontend!

## Success! 🎉

You now have a fully functional AI Sales Agent platform running locally!

**What you can do**:
- ✅ Create unlimited agents
- ✅ Train with custom knowledge
- ✅ Chat and test conversations
- ✅ View analytics
- ✅ Export leads
- ✅ Embed on websites

**Next**: Check out the other guides to:
- Set up Telegram bot
- Deploy to production
- Customize the UI
- Add more channels

Happy building! 🚀
