/*
  # Create Kliento OTP Rate Limits Table

  1. New Tables
    - `kliento_otp_rate_limits`
      - `id` (uuid, primary key) - Unique identifier
      - `phone_number` (text) - Phone number being rate limited
      - `request_count` (integer) - Number of OTP requests in window
      - `window_start` (timestamptz) - Start of the 15-minute rate limit window
      - `project_config_id` (uuid, FK) - Reference to project configuration
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `kliento_otp_rate_limits` table
    - No public access policies (accessed only via service role in Edge Functions)
    
  3. Indexes
    - Unique index on (phone_number, project_config_id) for upsert operations
    - Index on window_start for cleanup operations
    
  4. Notes
    - Rate limit: Max 5 requests per phone per 15-minute window
    - Window resets after 15 minutes of inactivity
*/

CREATE TABLE IF NOT EXISTS kliento_otp_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  window_start timestamptz NOT NULL DEFAULT now(),
  project_config_id uuid NOT NULL REFERENCES project_configurations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE kliento_otp_rate_limits IS 'Rate limiting for OTP requests. Max 5 requests per phone number per 15-minute window.';
COMMENT ON COLUMN kliento_otp_rate_limits.phone_number IS 'Phone number in E.164 format being rate limited';
COMMENT ON COLUMN kliento_otp_rate_limits.request_count IS 'Number of OTP requests within the current 15-minute window';
COMMENT ON COLUMN kliento_otp_rate_limits.window_start IS 'Start timestamp of the current rate limit window';

ALTER TABLE kliento_otp_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_kliento_otp_rate_limits_phone_project 
  ON kliento_otp_rate_limits(phone_number, project_config_id);

CREATE INDEX IF NOT EXISTS idx_kliento_otp_rate_limits_window_start 
  ON kliento_otp_rate_limits(window_start);
