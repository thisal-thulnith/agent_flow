# Qdrant Setup Guide

Qdrant provides a free vector database (1GB) perfect for storing AI agent knowledge.

## **TWO OPTIONS TO USE QDRANT**

---

## **Option 1: Qdrant Cloud (Recommended - Easiest)**

### Why Cloud?
✅ **1GB free storage** (vs Pinecone's 100K vectors)
✅ **No installation** needed
✅ **Production-ready** from day one
✅ **No credit card** required

### Setup Steps (3 minutes):

1. **Create Account**
   - Go to: **https://cloud.qdrant.io**
   - Click "Sign Up"
   - Use email or GitHub

2. **Create Cluster**
   - After login, click "Create Cluster"
   - Choose **"Free Tier"**
   - Region: Choose closest to you
   - Click "Create"
   - Wait 30-60 seconds

3. **Get Credentials**
   - Click on your cluster name
   - Go to **"API Keys"** tab
   - Click "Create API Key"
   - Copy the key (you can't see it again!)
   - Copy the **Cluster URL** (looks like: `https://xxxxx.qdrant.io`)

4. **Add to .env**
   ```bash
   QDRANT_URL=https://047a479e-b959-44b5-8f94-388a70cf3a9b.europe-west3-0.gcp.cloud.qdrant.io
   QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.Xqc7lQE26oh-yqxwoFlg2TY5ArSGlEDKBc8k2z9_nJs
   QDRANT_COLLECTION_NAME=sales_agents
   ```

✅ **Done! Your cloud vector database is ready!**

---

## **Option 2: Qdrant Local (Docker)**

### Why Local?
✅ **Unlimited storage** on your computer
✅ **Faster** (no network latency)
✅ **100% private** - data never leaves your machine
✅ **Free forever**

### Requirements:
- Docker installed on your computer
- If not installed: https://docker.com/get-started

### Setup Steps (1 minute):

1. **Run Qdrant Container**
   ```bash
   docker run -d -p 6333:6333 qdrant/qdrant
   ```

2. **Verify It's Running**
   ```bash
   # Check if container is running
   docker ps

   # You should see qdrant/qdrant in the list
   ```

3. **Test Connection**
   Open browser: **http://localhost:6333/dashboard**

   You should see the Qdrant dashboard!

4. **Configure .env**
   ```bash
   QDRANT_URL=http://localhost:6333
   QDRANT_API_KEY=
   QDRANT_COLLECTION_NAME=sales_agents
   ```

✅ **Done! Your local vector database is ready!**

---

## **Which Option Should You Choose?**

| Feature | Qdrant Cloud | Qdrant Local |
|---------|-------------|--------------|
| **Setup Time** | 3 min | 1 min |
| **Storage** | 1GB free | Unlimited |
| **Speed** | Good | Fastest |
| **Internet Required** | Yes | No |
| **Production Ready** | Yes | Need to deploy separately |
| **Best For** | Testing + Production | Development |

### **My Recommendation:**

**For Quick Start**: Use **Qdrant Local** (Docker)
- No signup needed
- Start testing immediately
- Can switch to cloud anytime

**For Production**: Use **Qdrant Cloud**
- No Docker management
- Easy to scale
- Reliable hosting

---

## **Verify Setup**

After configuring, start your backend:

```bash
cd backend
python main.py
```

You should see:
```
✅ Connected to Qdrant Cloud: https://xxxxx.qdrant.io
# OR
✅ Connected to Qdrant Local: http://localhost:6333

✅ Qdrant collection ready: sales_agents
```

---

## **Testing Qdrant**

### 1. Upload a document to your agent
```bash
# Via Swagger UI: http://localhost:8000/docs
# POST /api/training/pdf
# Upload any PDF file
```

### 2. Check Qdrant
- **Cloud**: Go to cluster dashboard → Collections → sales_agents
- **Local**: Open http://localhost:6333/dashboard → Collections

You should see vectors appear!

---

## **Troubleshooting**

### Docker Not Found (Local)
```bash
# Install Docker Desktop
# macOS: brew install --cask docker
# Windows/Linux: https://docker.com/get-started
```

### Container Won't Start
```bash
# Check if port 6333 is in use
lsof -i:6333

# Stop the container and restart
docker stop $(docker ps -q --filter ancestor=qdrant/qdrant)
docker run -d -p 6333:6333 qdrant/qdrant
```

### Can't Connect to Cloud
- Check URL is correct (should start with https://)
- Verify API key is copied completely
- Make sure cluster is "Active" in dashboard

### Collection Not Creating
- Check backend logs for errors
- Verify Qdrant is accessible
- Try creating collection manually in dashboard

---

## **Switching Between Cloud and Local**

You can easily switch by changing `.env`:

**To Cloud:**
```bash
QDRANT_URL=https://xxxxx.qdrant.io
QDRANT_API_KEY=your-api-key
```

**To Local:**
```bash
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
```

Restart backend and it will use the new configuration!

---

## **Free Tier Limits**

### Qdrant Cloud Free
- **Storage**: 1GB
- **Requests**: Unlimited
- **Collections**: Unlimited
- **Nodes**: 1 (shared)

**Enough for**:
- ~500,000 text chunks (1536 dimensions)
- 20-50 agents with moderate documentation
- All development and testing needs

### Qdrant Local
- **No limits!**
- Limited only by your computer's storage

---

## **Advanced: Data Persistence (Local)**

To keep data after container restart:

```bash
docker run -d \
  -p 6333:6333 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

This saves data to `./qdrant_storage` on your machine.

---

## **Next Step**

✅ Qdrant is set up!

Continue to: [03_SETUP_FIREBASE.md](03_SETUP_FIREBASE.md)

---

## **Why We Use Qdrant**

Compared to alternatives:

| | Qdrant | Pinecone | ChromaDB |
|---|---|---|---|
| **Free Tier** | 1GB | 100K vectors | Unlimited (local only) |
| **Setup** | Easy | Easy | Easiest |
| **Performance** | Excellent | Excellent | Good |
| **Production** | ✅ | ✅ | ❌ (local only) |
| **Open Source** | ✅ | ❌ | ✅ |

**Qdrant gives you the best of both worlds**: Easy setup + Production ready + Open source!
