-- Products table with photos, prices, and detailed information
-- Run this in your Supabase SQL Editor

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
    CONSTRAINT fk_agent
        FOREIGN KEY(agent_id)
        REFERENCES agents(id)
        ON DELETE CASCADE
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_agent_id ON products(agent_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access products for their own agents
CREATE POLICY "Users can access their agent's products"
ON products
FOR ALL
USING (
    agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
    )
);

COMMENT ON TABLE products IS 'Product catalog for AI sales agents with photos, prices, and detailed information';
