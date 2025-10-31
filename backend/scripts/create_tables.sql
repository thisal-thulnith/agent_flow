-- ============================================
-- SALES AI AGENT - DATABASE SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste > Run

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGENTS TABLE
-- ============================================
-- Stores AI sales agent configurations
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

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
-- Stores chat conversations between users and agents
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
CREATE INDEX IF NOT EXISTS idx_conversations_lead_info ON conversations((lead_info IS NOT NULL));

-- ============================================
-- ANALYTICS TABLE
-- ============================================
-- Daily analytics per agent
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

-- Unique constraint: one record per agent per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_agent_date ON analytics(agent_id, date);

-- ============================================
-- TRAINING DATA TABLE
-- ============================================
-- Tracks uploaded/processed training documents
CREATE TABLE IF NOT EXISTS training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'url', 'faq', 'text')),
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_data_agent_id ON training_data(agent_id);
CREATE INDEX IF NOT EXISTS idx_training_data_status ON training_data(status);
CREATE INDEX IF NOT EXISTS idx_training_data_created_at ON training_data(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Optional: Enable RLS for additional security
-- Uncomment if you want to use RLS with Supabase Auth

-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;

-- Create policy for agents (users can only see their own agents)
-- CREATE POLICY "Users can view their own agents" ON agents
--     FOR SELECT USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can create their own agents" ON agents
--     FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- CREATE POLICY "Users can update their own agents" ON agents
--     FOR UPDATE USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can delete their own agents" ON agents
--     FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('agents', 'conversations', 'analytics', 'training_data');

-- ============================================
-- SUCCESS!
-- ============================================
-- If you see all 4 tables listed, you're good to go!
-- Close this and start your backend server.
