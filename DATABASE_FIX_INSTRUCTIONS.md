# Database Setup Fix - Missing Tables

## Problem
You're getting this error: `Could not find the table 'public.products' in the schema cache`

This means your Supabase database is missing the `products` table (and possibly others).

## Solution: Run Complete Database Setup

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Run the Complete Setup Script

Copy the entire contents of this file:
```
backend/scripts/complete_database_setup.sql
```

Paste it into the SQL Editor and click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Tables Were Created

You should see output showing all 6 tables were created:
- ✓ agents
- ✓ products
- ✓ conversations
- ✓ orders
- ✓ analytics
- ✓ training_data

### Step 4: Restart Your Backend

After running the SQL script, restart your backend server:

```bash
# Stop the current backend (Ctrl+C in the terminal running it)
# Then start it again:
cd /Users/thisalthulnith/sales_agent/backend
python3 main.py
```

### Step 5: Test Agent Creation

Now try creating an agent again. It should work!

## What This Fix Does

The complete database setup script creates ALL required tables:

1. **agents** - Stores your AI sales agents
2. **products** - Product catalog with prices, images, descriptions
3. **conversations** - Chat history and messages
4. **orders** - Order tracking and management
5. **analytics** - Performance metrics and stats
6. **training_data** - Knowledge base and FAQs

It also creates:
- Proper indexes for fast queries
- Foreign key relationships
- Triggers for auto-updating timestamps
- Functions for generating order numbers

## Why Agents Weren't Saving

The conversational agent builder WAS creating agents correctly, but it failed when trying to save products because the `products` table didn't exist.

Once you run the SQL script above, both problems will be fixed:
1. ✅ Products table will exist
2. ✅ Agents created through chat will save properly

## Still Having Issues?

If you still see errors after running the SQL:

1. **Check Supabase connection**: Make sure your `.env` has correct Supabase credentials
2. **Verify tables exist**: Run this in Supabase SQL Editor:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
3. **Check backend logs**: Look for any error messages in your backend terminal
