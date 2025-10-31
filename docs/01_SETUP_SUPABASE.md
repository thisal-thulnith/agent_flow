# Supabase Setup Guide

Supabase provides a free PostgreSQL database (500MB) that we'll use to store agents, conversations, and analytics.

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub, Google, or Email
4. Verify your email if needed

## Step 2: Create New Project

1. Click **"New Project"**
2. Choose your organization (or create one)
3. Fill in project details:
   - **Name**: `sales-ai-agent` (or any name you like)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free (default)
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

## Step 3: Get API Credentials

Once your project is ready:

1. Go to **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project API keys**:
     - `anon` `public` - This is your **SUPABASE_ANON_KEY**
     - `service_role` `secret` - This is your **SUPABASE_SERVICE_KEY**

### Copy These Values:

```bash
SUPABASE_URL=https://scowthaiyvocyniczowe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjb3d0aGFpeXZvY3luaWN6b3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDQxNTksImV4cCI6MjA3NjcyMDE1OX0.Nile9KuWqGsWCXMVQidUIENdHXQzjGYfLNZLGoozwAY
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjb3d0aGFpeXZvY3luaWN6b3dlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE0NDE1OSwiZXhwIjoyMDc2NzIwMTU5fQ.89CYgU8Cj6wFdU06txJDbvAk9MRk5e737wwWF9bNytU
```

## Step 4: Create Database Tables

1. Go to **SQL Editor** (in sidebar)
2. Click **"New query"**
3. Copy the contents of `backend/scripts/create_tables.sql`
4. Paste into the query editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see: "Success. No rows returned"

## Step 5: Verify Tables Were Created

Run this query to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('agents', 'conversations', 'analytics', 'training_data');
```

You should see all 4 tables listed!

## Step 6: Add Credentials to .env

Open your `.env` file in the project root and add:

```bash
SUPABASE_URL=<your-project-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-role-key>
```

## Troubleshooting

### Can't find SQL Editor?
- Make sure your project finished initializing
- Look in the left sidebar for "SQL Editor"

### Tables not creating?
- Make sure you copied the ENTIRE SQL from create_tables.sql
- Check for any error messages in red
- Verify you're in the right project

### Need to reset?
Run this to drop all tables:
```sql
DROP TABLE IF EXISTS training_data CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
```

Then re-run the create_tables.sql

## Next Step

✅ Supabase is set up!

Continue to: [02_SETUP_PINECONE.md](02_SETUP_PINECONE.md)
