-- Add shop_id column to products table
ALTER TABLE products ADD COLUMN shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);