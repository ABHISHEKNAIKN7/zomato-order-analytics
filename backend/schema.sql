-- =====================================================
-- DATABASE SCHEMA
-- Purpose: Create the PostgreSQL tables and indexes used
-- by the Restaurant Order Analytics application.
-- =====================================================

-- =====================================================
-- RESTAURANTS TABLE
-- Stores one record for each restaurant.
-- =====================================================
CREATE TABLE IF NOT EXISTS restaurants (
    restaurant_id SERIAL PRIMARY KEY,
    restaurant_name TEXT NOT NULL UNIQUE,
    subzone TEXT,
    city TEXT
);

-- =====================================================
-- CUSTOMERS TABLE
-- Stores customer IDs and their phone numbers.
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    customer_phone TEXT
);

-- =====================================================
-- ORDERS TABLE
-- Main fact table containing every restaurant order.
-- Foreign keys connect orders to restaurants and customers.
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(restaurant_id),
    customer_id TEXT REFERENCES customers(customer_id),
    subzone TEXT,
    city TEXT,
    order_placed_at TIMESTAMP,
    order_status TEXT,
    delivery_type TEXT,
    distance_km NUMERIC(10,2),
    items_in_order TEXT,
    instructions TEXT,
    bill_subtotal NUMERIC(12,2),
    packaging_charges NUMERIC(12,2),
    total NUMERIC(12,2),
    rating NUMERIC(3,1),
    review TEXT,
    cancellation_reason TEXT,
    restaurant_compensation NUMERIC(12,2),
    restaurant_penalty NUMERIC(12,2),
    kpt_duration NUMERIC(10,2),
    rider_wait_time NUMERIC(10,2),
    order_ready_marked TEXT,
    customer_complaint_tag TEXT,
    customer_phone TEXT
);

-- =====================================================
-- INDEXES
-- Purpose: Speed up the most common order lookups.
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(order_placed_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
