/*
  # Coupon Distribution System Schema

  1. New Tables
    - `coupons`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `description` (text)
      - `is_claimed` (boolean)
      - `created_at` (timestamp)
    
    - `claims`
      - `id` (uuid, primary key)
      - `coupon_id` (uuid, foreign key)
      - `ip_address` (text)
      - `browser_id` (text)
      - `claimed_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access to read and update coupons
    - Add policies for claiming coupons
*/

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  is_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES coupons(id),
  ip_address text NOT NULL,
  browser_id text NOT NULL,
  claimed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read available coupons" ON coupons;
DROP POLICY IF EXISTS "Anyone can claim available coupons" ON coupons;
DROP POLICY IF EXISTS "Anyone can create claims" ON claims;
DROP POLICY IF EXISTS "Anyone can read their own claims" ON claims;

-- Updated policies for coupons
CREATE POLICY "Anyone can read coupons"
  ON coupons
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update unclaimed coupons"
  ON coupons
  FOR UPDATE
  TO public
  USING (NOT is_claimed)
  WITH CHECK (true);

-- Policies for claims
CREATE POLICY "Anyone can create claims"
  ON claims
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read their own claims"
  ON claims
  FOR SELECT
  TO public
  USING (true);

-- Insert some sample coupons
INSERT INTO coupons (code, description)
VALUES 
  ('SAVE10', '10% off your next purchase'),
  ('FREESHIP', 'Free shipping on orders over $50'),
  ('SPRING25', '25% off spring collection'),
  ('WELCOME15', '15% off for new customers'),
  ('FLASH50', '50% off flash sale')
ON CONFLICT DO NOTHING;