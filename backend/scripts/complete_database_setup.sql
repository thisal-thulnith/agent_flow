-- ============================================
-- SALES AI AGENT - COMPLETE DATABASE SETUP
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- This creates ALL required tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGENTS TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    detailed_description TEXT,
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    image_url TEXT,
    category VARCHAR(100),
    features JSONB DEFAULT '[]'::jsonb,
    specifications JSONB DEFAULT '{}'::jsonb,
    stock_status VARCHAR(50) DEFAULT 'in_stock',
    sku VARCHAR(100),
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_products_agent
        FOREIGN KEY(agent_id)
        REFERENCES agents(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_agent_id ON products(agent_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_info ON conversations((lead_info IS NOT NULL));

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    shipping_address JSONB,
    items JSONB NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    estimated_delivery DATE,
    customer_notes TEXT,
    internal_notes TEXT,
    status_history JSONB DEFAULT '[]'::jsonb,
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_conversation_id ON orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- ============================================
-- ANALYTICS TABLE
-- ============================================
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_agent_date ON analytics(agent_id, date);

-- ============================================
-- TRAINING DATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'url', 'faq', 'text')),
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_data_agent_id ON training_data(agent_id);
CREATE INDEX IF NOT EXISTS idx_training_data_status ON training_data(status);
CREATE INDEX IF NOT EXISTS idx_training_data_created_at ON training_data(created_at DESC);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Auto-update updated_at for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON orders;
CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_order_number TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        new_order_number := 'ORD-' ||
                           TO_CHAR(NOW(), 'YYYY') || '-' ||
                           LPAD((FLOOR(RANDOM() * 999999) + 1)::TEXT, 6, '0');

        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) THEN
            RETURN new_order_number;
        END IF;

        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Could not generate unique order number after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
    table_name,
    CASE
        WHEN table_name = ANY(ARRAY['agents', 'products', 'conversations', 'orders', 'analytics', 'training_data'])
        THEN '✓ Created'
        ELSE '✗ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('agents', 'products', 'conversations', 'orders', 'analytics', 'training_data')
ORDER BY table_name;

-- ============================================
-- SUCCESS!
-- ============================================
-- If you see all 6 tables with ✓ Created status, you're ready!
-- Tables: agents, products, conversations, orders, analytics, training_data
