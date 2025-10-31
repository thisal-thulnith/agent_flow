# 🤖 Sales AI Agent Platform

> Create intelligent AI sales agents for your business in minutes. Train them with your product knowledge, embed them anywhere, and watch them convert leads automatically.

## ✨ Features

- 🎯 **Multi-Agent System** - Create unlimited AI sales agents
- 🧠 **Smart Conversations** - Powered by LangGraph & OpenAI
- 📚 **Knowledge Training** - Upload PDFs, scrape websites, add FAQs
- 🌐 **Multi-Channel** - Website embed, Telegram, WhatsApp
- 📊 **Analytics Dashboard** - Track conversations, leads, conversions
- 🔒 **Secure Authentication** - Firebase-powered login
- 🎨 **Modern UI** - Beautiful React + Tailwind interface
- 🌍 **Multi-Language** - Auto-translate conversations
- 💰 **100% Free Tier** - Uses only free cloud services

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python API framework
- **LangGraph** - AI conversation flow orchestration
- **LangChain** - LLM integration framework
- **Supabase** - PostgreSQL database (free 500MB)
- **Pinecone** - Vector database (free 100K vectors)
- **OpenAI API** - GPT-4o-mini language model

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Firebase Auth** - User authentication
- **Zustand** - State management
- **React Query** - Data fetching

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Git

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd sales_agent
```

### 2. Setup Accounts (15 minutes)
Follow these guides in order:
1. [Supabase Setup](docs/01_SETUP_SUPABASE.md) - Database
2. [Pinecone Setup](docs/02_SETUP_PINECONE.md) - Vector DB
3. [Firebase Setup](docs/03_SETUP_FIREBASE.md) - Authentication
4. [OpenAI Setup](docs/04_SETUP_OPENAI.md) - AI Model

### 3. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env and fill in your credentials
# (Get them from the setup guides above)
nano .env
```

### 4. Setup Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python scripts/init_db.py

# Run backend server
python main.py
```

Backend will run on: http://localhost:8000

### 5. Setup Frontend
```bash
# Open new terminal
cd frontend

# Install dependencies
npm install

# Create frontend environment file
cp .env.example .env
# Edit frontend/.env with your Firebase config

# Run development server
npm run dev
```

Frontend will run on: http://localhost:5173

### 6. Test It Out!
1. Open http://localhost:5173
2. Sign up for an account
3. Create your first AI sales agent
4. Train it with your product info
5. Chat with it!
6. Get embed code for your website

## 📖 Documentation

- [Complete Setup Guide](docs/05_CONFIGURATION.md)
- [Running Locally](docs/06_RUN_LOCALLY.md)
- [Telegram Bot Setup](docs/07_TELEGRAM_SETUP.md)
- [API Documentation](docs/08_API_REFERENCE.md)
- [Troubleshooting](docs/09_TROUBLESHOOTING.md)

## 🎯 How It Works

```
1. Create Agent
   ↓
   Enter company name, products, description
   ↓
2. Train Agent
   ↓
   Upload PDFs, add URLs, write FAQs
   ↓
   Documents → Chunked → Embedded → Stored in Pinecone
   ↓
3. Deploy Agent
   ↓
   Copy embed code or connect to Telegram/WhatsApp
   ↓
4. Customer Chats
   ↓
   User Message → LangGraph Agent
   ↓
   Search Pinecone for relevant knowledge
   ↓
   Generate response with OpenAI + context
   ↓
   Track conversation & capture leads
   ↓
5. View Analytics
   ↓
   See conversations, leads, conversions
```

## 📁 Project Structure

```
sales_agent/
├── backend/              # FastAPI backend
│   ├── main.py          # Entry point
│   ├── config.py        # Configuration
│   ├── database/        # Supabase models
│   ├── agents/          # LangGraph AI agents
│   ├── routers/         # API endpoints
│   ├── services/        # Business logic
│   └── scripts/         # Utility scripts
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable UI
│   │   ├── services/   # API & Firebase
│   │   └── store/      # State management
│   └── public/
│       └── widget.js   # Embeddable widget
│
└── docs/               # Documentation
```

## 🔑 Key Features Explained

### Multi-Agent Management
Create separate AI agents for different products, brands, or use cases. Each agent has its own:
- Knowledge base (trained documents)
- Personality and tone
- Sales strategy
- Analytics

### Smart RAG (Retrieval Augmented Generation)
Agents don't hallucinate - they answer based on your documents:
1. User asks a question
2. System searches Pinecone for relevant chunks
3. Sends context + question to OpenAI
4. Gets accurate, source-based answer

### Conversation Intelligence (LangGraph)
Agents handle complex sales flows:
- Greeting and rapport building
- Need identification
- Product recommendation
- Objection handling
- Lead qualification
- Call-to-action prompts

### Lead Capture
Agents naturally collect:
- Name
- Email
- Phone number
- Specific interests
- Budget range

All stored in Supabase for easy export.

## 💰 Free Tier Limits

All services offer generous free tiers:

| Service | Free Tier | Monthly Limit |
|---------|-----------|---------------|
| Supabase | 500MB DB, 1GB storage | Unlimited API calls |
| Pinecone | 100K vectors | 1 index |
| Firebase Auth | 10K users | Unlimited sign-ins |
| OpenAI | Pay-per-use | ~$0.001 per conversation |
| Telegram | Free | Unlimited |

**Estimated costs for 1,000 conversations/month: $2-5**

## 🔒 Security

- Firebase Authentication with email verification
- JWT token validation on all protected routes
- API rate limiting (100 requests/min per IP)
- Input sanitization and validation
- Secure credential storage (environment variables)
- CORS configuration for frontend-only access

## 🌐 Multi-Channel Support

### Website Embed
```html
<script src="https://your-domain.com/widget.js"
        data-agent-id="your-agent-id">
</script>
```

### Telegram
Create bot with @BotFather, add webhook URL, done!

### WhatsApp (Coming Soon)
Integration with Twilio/Green API

## 📊 Analytics

Track for each agent:
- Total conversations
- Total messages sent/received
- Leads captured with contact info
- Conversion rate
- Popular questions asked
- Average conversation length
- Daily/weekly trends

Export all data to CSV.

## 🛠️ Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Formatting
```bash
# Backend
black .
isort .

# Frontend
npm run lint
npm run format
```

## 🚢 Deployment

Ready to deploy? Check out:
- [Deploy Backend to Render](docs/10_DEPLOY_BACKEND.md)
- [Deploy Frontend to Vercel](docs/11_DEPLOY_FRONTEND.md)

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🆘 Support

- Check [Troubleshooting Guide](docs/09_TROUBLESHOOTING.md)
- Open an issue on GitHub
- Email: support@yourproject.com

## 🎉 What's Next?

After getting the basic system working:
- [ ] Add WhatsApp Business API integration
- [ ] Implement voice conversation support
- [ ] Add custom branding options
- [ ] Build marketplace for agent templates
- [ ] Add A/B testing for agent responses
- [ ] Implement advanced analytics (funnel analysis)
- [ ] Add team collaboration features
- [ ] Build mobile app (React Native)

---

**Built with ❤️ using 100% free and open-source tools**

Start building your AI sales team today! 🚀
# agent_flow
