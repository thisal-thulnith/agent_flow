"""
Database Initialization Script
Creates all necessary tables in Supabase
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from database.supabase_client import get_admin_supabase
from config import settings


# SQL commands to create tables
CREATE_TABLES_SQL = """
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    company_description TEXT NOT NULL,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    tone TEXT NOT NULL DEFAULT 'friendly',
    language TEXT NOT NULL DEFAULT 'en',
    greeting_message TEXT,
    sales_strategy TEXT,
    pinecone_namespace TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'web',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    lead_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    leads_captured INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint on agent_id + date
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_agent_date ON analytics(agent_id, date);

-- Training data table
CREATE TABLE IF NOT EXISTS training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'url', 'faq', 'text')),
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_training_data_agent_id ON training_data(agent_id);
CREATE INDEX IF NOT EXISTS idx_training_data_status ON training_data(status);
"""


def init_database():
    """Initialize database with required tables"""
    print("=" * 60)
    print("DATABASE INITIALIZATION")
    print("=" * 60)

    try:
        # Get Supabase admin client
        print("\n📊 Connecting to Supabase...")
        supabase = get_admin_supabase()

        print(f"✅ Connected to: {settings.SUPABASE_URL}")

        # Execute SQL commands
        print("\n🔨 Creating tables...")

        # Note: Supabase Python client doesn't support raw SQL execution directly
        # You need to run these SQL commands in the Supabase SQL Editor
        # Or use psycopg2 to connect directly to PostgreSQL

        print("\n⚠️  IMPORTANT:")
        print("   The Supabase Python client doesn't support raw SQL execution.")
        print("   Please follow these steps:")
        print("\n   1. Go to your Supabase Dashboard")
        print("   2. Navigate to: SQL Editor")
        print("   3. Create a new query")
        print("   4. Copy and paste the SQL below")
        print("   5. Click 'Run'")

        print("\n" + "=" * 60)
        print("SQL TO RUN IN SUPABASE SQL EDITOR:")
        print("=" * 60)
        print(CREATE_TABLES_SQL)
        print("=" * 60)

        # Alternative: Save SQL to file
        sql_file = Path(__file__).parent / "create_tables.sql"
        with open(sql_file, 'w') as f:
            f.write(CREATE_TABLES_SQL)

        print(f"\n💾 SQL also saved to: {sql_file}")
        print("   You can upload this file in the Supabase SQL Editor")

        print("\n✅ Initialization script completed!")
        print("   Run the SQL in Supabase Dashboard to create tables.")

        return True

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False


if __name__ == "__main__":
    print("\n🚀 Starting database initialization...\n")

    success = init_database()

    if success:
        print("\n✅ SUCCESS!")
        print("\nNext steps:")
        print("1. Run the SQL in Supabase SQL Editor")
        print("2. Verify tables are created")
        print("3. Start your backend: python backend/main.py")
    else:
        print("\n❌ FAILED!")
        print("Please check the error message above and try again.")

    print("\n")
