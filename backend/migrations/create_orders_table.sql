-- Migration: Create Orders Table
-- Description: Complete order tracking and management system
-- Created: 2025-10-31

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    -- Primary Info
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,

    -- Relations
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,

    -- Customer Info
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    shipping_address JSONB,

    -- Order Details
    items JSONB NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Order Status
    status VARCHAR(50) DEFAULT 'pending',

    -- Tracking
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    estimated_delivery DATE,

    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,
    status_history JSONB DEFAULT '[]'::jsonb,

    -- Payment
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_conversation_id ON orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON orders;
CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Create function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_order_number TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Format: ORD-YYYY-NNNNNN (e.g., ORD-2025-000001)
        new_order_number := 'ORD-' ||
                           TO_CHAR(NOW(), 'YYYY') || '-' ||
                           LPAD((FLOOR(RANDOM() * 999999) + 1)::TEXT, 6, '0');

        -- Check if this order number already exists
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

-- Add comments for documentation
COMMENT ON TABLE orders IS 'Stores all orders placed through AI agents';
COMMENT ON COLUMN orders.order_number IS 'Unique human-readable order identifier (e.g., ORD-2025-000001)';
COMMENT ON COLUMN orders.status IS 'Order status: pending, confirmed, processing, packaged, shipped, delivered, cancelled';
COMMENT ON COLUMN orders.items IS 'JSON array of order items with product details';
COMMENT ON COLUMN orders.shipping_address IS 'JSON object with complete shipping address';
COMMENT ON COLUMN orders.status_history IS 'JSON array tracking all status changes with timestamps';
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, paid, failed, refunded';

-- Insert sample data for testing (optional - comment out for production)
-- INSERT INTO orders (
--     order_number,
--     agent_id,
--     user_id,
--     customer_name,
--     customer_email,
--     customer_phone,
--     shipping_address,
--     items,
--     total_amount,
--     status,
--     payment_status
-- ) VALUES (
--     generate_order_number(),
--     (SELECT id FROM agents LIMIT 1),
--     (SELECT user_id FROM agents LIMIT 1),
--     'John Doe',
--     'john@example.com',
--     '+1234567890',
--     '{"street": "123 Main St", "city": "New York", "state": "NY", "zip": "10001", "country": "USA"}'::jsonb,
--     '[{"product_id": "sample", "name": "Sample Product", "quantity": 1, "price": 99.99}]'::jsonb,
--     99.99,
--     'pending',
--     'pending'
-- );
