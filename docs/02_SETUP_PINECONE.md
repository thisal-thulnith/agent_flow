# Pinecone Setup Guide

Pinecone provides a free vector database (100K vectors) perfect for storing AI agent knowledge.

## Step 1: Create Pinecone Account

1. Go to [https://www.pinecone.io](https://www.pinecone.io)
2. Click **"Sign Up Free"**
3. Sign up with Google or Email
4. Verify your email

## Step 2: Create API Key

1. After login, you'll be in the Pinecone Console
2. Go to **"API Keys"** in the left sidebar
3. Click **"Create API Key"**
4. Give it a name: `sales-agent`
5. Click **"Create Key"**
6. **IMPORTANT**: pcsk_5JKdSv_R4kwnt2PTVpaduTPivfTiW2PiMbET6cxY3UKm19ntaAuaVXASfY6KHj41bkNkLw

```bash
PINECONE_API_KEY=pcsk_xxxxx
```

## Step 3: Get Your Environment

The environment is shown next to your API key:
- Common values: `gcp-starter`, `us-east-1-gcp`, `us-west-2-aws`
- Copy this value

```bash
PINECONE_ENVIRONMENT=gcp-starter
```

## Step 4: Index Configuration

**Good News**: The index is created automatically!

When you first start the backend, it will:
1. Check if an index named `sales-agents` exists
2. If not, create it automatically
3. Configure it with the right settings (dimension: 1536, metric: cosine)

You don't need to create the index manually!

## Step 5: Add Credentials to .env

Open your `.env` file and add:

```bash
PINECONE_API_KEY=<your-api-key>
PINECONE_ENVIRONMENT=gcp-starter
PINECONE_INDEX_NAME=sales-agents
```

## Free Tier Limits

| Feature | Free Tier |
|---------|-----------|
| Vectors | 100,000 |
| Indexes | 1 |
| Queries | Unlimited |
| Updates | Unlimited |

**Estimation**: 100K vectors = ~500 documents (200-300 chunks each)

This is perfect for:
- 10-20 agents with moderate documentation
- Or 1-2 agents with extensive knowledge bases

## Verify Setup

Once your backend starts, you'll see:

```
✅ Connected to Pinecone index: sales-agents
```

If you see this, you're good to go!

## Troubleshooting

### "Invalid API Key" Error
- Make sure you copied the entire key (starts with `pcsk_`)
- Check for extra spaces or newlines
- Try creating a new API key

### Wrong Environment
- Go to Pinecone Console
- Your environment is shown next to your API key
- Common mistake: using `us-east1` instead of `us-east-1-aws`

### "Index already exists" Error
- This is actually fine! It means the index was created
- The backend will connect to the existing index

### Need to Reset Pinecone?
1. Go to Pinecone Console
2. Click on the "sales-agents" index
3. Click "Delete Index"
4. Restart your backend (it will recreate it)

## Testing Pinecone

After setup, you can test by:
1. Creating an agent in the frontend
2. Uploading a PDF
3. Check Pinecone Console > Indexes > sales-agents
4. You should see vectors appear!

## Next Step

✅ Pinecone is set up!

Continue to: [03_SETUP_FIREBASE.md](03_SETUP_FIREBASE.md)
