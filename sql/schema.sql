-- ==============================================================================
-- GIR NAARI - DIGITAL CUSTOMER & ORDER REGISTER
-- Supabase Database Schema (Only 3 Tables: customers, orders, reminders)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. CUSTOMERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    area TEXT NOT NULL,
    address TEXT,
    customer_type TEXT DEFAULT 'Regular' CHECK (customer_type IN ('Regular', 'Small Shop', 'Wholesaler', 'Other')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for lightning fast search and area filtering
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_area ON public.customers(area);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. ORDERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'litre' CHECK (unit IN ('kg', 'gram', 'litre', 'ml')),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Other')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. REMINDERS TABLE (Tracks manual follow-ups / WhatsApp contacts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    last_contacted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_customer_id ON public.reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_last_contacted_at ON public.reminders(last_contacted_at DESC);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables standard safe access for the family web register using anon/publishable key
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Allow read/write operations for application users with anon key
DROP POLICY IF EXISTS "Allow family register full access to customers" ON public.customers;
CREATE POLICY "Allow family register full access to customers"
    ON public.customers
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow family register full access to orders" ON public.orders;
CREATE POLICY "Allow family register full access to orders"
    ON public.orders
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow family register full access to reminders" ON public.reminders;
CREATE POLICY "Allow family register full access to reminders"
    ON public.reminders
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- OPTIONAL SAMPLE SEED DATA (For initial testing if starting fresh)
-- ==============================================================================
/*
INSERT INTO public.customers (name, phone, area, address, customer_type, notes)
VALUES 
    ('Rajesh Patel', '9825012345', 'Gota', 'A-402, Shivalik Residency, Gota, Ahmedabad', 'Regular', 'Prefers glass jar'),
    ('Meenaben Shah', '9898023456', 'Vaishnodevi Circle', 'B-12, Satyamev Vista, SG Highway', 'Regular', 'Call before delivery'),
    ('Jayeshbhai Soni', '9426034567', 'Chandkheda', 'Shop 4, Swagat Complex', 'Small Shop', 'Weekly 5L order'),
    ('Kavitaben Joshi', '9824045678', 'Bodakdev', '701, Dev Aurum', 'Regular', 'Pays via Google Pay UPI'),
    ('Harshad Vora', '9727056789', 'Gota', 'Flat 104, Royal Palms', 'Regular', 'Likes golden yellow grain ghee');
*/

