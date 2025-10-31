# OpenAI API Setup Guide

OpenAI provides the AI brain for your sales agents. You'll need an API key.

## Step 1: Create OpenAI Account

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Click **"Sign up"** or **"Log in"**
3. Create account with:
   - Email
   - Google
   - Microsoft
4. Verify your email

## Step 2: Add Payment Method (Required)

**Important**: OpenAI requires a payment method, but you only pay for what you use.

1. Go to [https://platform.openai.com/account/billing](https://platform.openai.com/account/billing)
2. Click **"Add payment method"**
3. Enter credit/debit card details
4. (Optional) Set up **billing limits** to control spending:
   - Click **"Usage limits"**
   - Set **Hard limit**: $10/month (or whatever you're comfortable with)
   - Set **Soft limit**: $5/month (gets a warning email)

## Step 3: Get API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. **Name**: `sales-agent`
4. **Permissions**: All (default)
5. Click **"Create secret key"**
6. **CRITICAL**: Copy the key NOW (you can't see it again!)

```bash
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

⚠️ **Never share this key or commit it to Git!**

## Step 4: Add to .env File

Open your `.env` file and add:

```bash
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_MODEL=gpt-4o-mini
```

## Models & Pricing

We use **GPT-4o-mini** by default (cheapest and fastest):

| Model | Input Cost | Output Cost | Best For |
|-------|-----------|-------------|----------|
| **gpt-4o-mini** | $0.150 / 1M tokens | $0.600 / 1M tokens | ✅ Production (cheap, fast) |
| gpt-4o | $2.50 / 1M tokens | $10.00 / 1M tokens | Complex reasoning |
| gpt-3.5-turbo | $0.50 / 1M tokens | $1.50 / 1M tokens | Budget option |

### Cost Estimation

Average sales conversation:
- User messages: ~200 tokens
- Agent responses: ~300 tokens
- Context from knowledge base: ~500 tokens
- **Total per conversation**: ~1,000 tokens

**Example costs with GPT-4o-mini**:
- 1,000 conversations: ~$0.75
- 10,000 conversations: ~$7.50
- 100,000 conversations: ~$75

**Much cheaper than hiring a human sales rep!** 🚀

## Step 5: Test API Key

Run this quick test:

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello!"}]
  }'
```

You should get a response like:
```json
{
  "choices": [
    {
      "message": {
        "content": "Hello! How can I assist you today?"
      }
    }
  ]
}
```

## Free Alternative: Groq API (Optional)

If you want a **100% free alternative** for testing:

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Get API key
4. Update .env:

```bash
# Comment out OpenAI, use Groq instead
# OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_xxxxx
GROQ_MODEL=mixtral-8x7b-32768
```

**Groq limits**: 14,400 requests/day (free!)

## Troubleshooting

### "Incorrect API key" Error
- Make sure you copied the ENTIRE key (starts with `sk-`)
- Check for extra spaces or newlines in .env
- Verify the key is active in OpenAI dashboard

### "You exceeded your current quota"
- Go to billing settings
- Add a payment method
- Check usage limits aren't set to $0

### "Model not found" Error
- Make sure you're using a valid model name
- Try `gpt-4o-mini` (recommended)
- Check spelling (it's case-sensitive!)

### Rate Limiting
New accounts have these limits:
- **Tier 1**: 500 requests/day, 10,000 tokens/minute

To increase limits:
- Add $5+ to your account balance
- Wait 7 days (auto-upgrades to Tier 2)

### Cost Control

**Set spending limits**:
1. Go to Billing > Usage limits
2. Set hard limit: $10/month
3. You'll get email when you hit 75%, 90%, 100%

**Monitor usage**:
1. Go to Usage page
2. See daily/monthly costs
3. Download usage reports

## Security Best Practices

### ✅ DO:
- Store key in .env file only
- Add .env to .gitignore
- Rotate keys if exposed
- Set billing limits

### ❌ DON'T:
- Commit keys to Git
- Share keys in Slack/Discord
- Use same key for multiple projects
- Put keys in client-side code

## Optimizing Costs

**Tips to save money**:

1. **Use GPT-4o-mini**: 10x cheaper than GPT-4
2. **Limit response length**: Set max_tokens=500
3. **Cache system prompts**: We already do this!
4. **Efficient prompts**: Shorter = cheaper
5. **Monitor usage**: Check daily in OpenAI dashboard

## Embeddings for Vector Database

We use OpenAI embeddings for the knowledge base:

- Model: `text-embedding-3-small`
- Cost: $0.02 per 1M tokens
- Alternative (free): `sentence-transformers` (we support this too!)

To use free embeddings, update `backend/agents/vector_store.py`:

```python
# Replace OpenAIEmbeddings with:
from langchain.embeddings import HuggingFaceEmbeddings
self.embeddings = HuggingFaceEmbeddings()
```

## Next Step

✅ OpenAI is set up!

Continue to: [05_CONFIGURATION.md](05_CONFIGURATION.md)
