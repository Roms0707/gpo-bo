/*
  # Create Kliento OTP Codes Table

  1. New Tables
    - `kliento_otp_codes`
      - `id` (uuid, primary key) - Unique identifier
      - `phone_number` (text, indexed) - E.164 formatted phone number
      - `otp_code_hash` (text) - SHA-256 hashed OTP code for security
      - `status` (text) - OTP status: valid, used, expired, invalidated
      - `expires_at` (timestamptz) - When OTP expires (60 seconds after creation)
      - `attempt_count` (integer) - Failed verification attempts (max 3)
      - `project_config_id` (uuid, FK) - Reference to project configuration
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `kliento_otp_codes` table
    - No public access policies (accessed only via service role in Edge Functions)
    
  3. Indexes
    - Index on phone_number for fast lookups
    - Index on project_config_id for filtering
    - Index on status and expires_at for finding valid OTPs
*/

CREATE TABLE IF NOT EXISTS kliento_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'expired', 'invalidated')),
  expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  project_config_id uuid NOT NULL REFERENCES project_configurations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE kliento_otp_codes IS 'Stores hashed 4-digit OTP codes for Kliento phone authentication. OTPs expire after 60 seconds.';
COMMENT ON COLUMN kliento_otp_codes.phone_number IS 'Phone number in E.164 format (e.g., +33612345678)';
COMMENT ON COLUMN kliento_otp_codes.otp_code_hash IS 'SHA-256 hash of the 4-digit OTP code. Raw code is never stored.';
COMMENT ON COLUMN kliento_otp_codes.status IS 'OTP status: valid (can be used), used (already verified), expired (time exceeded), invalidated (new OTP requested)';
COMMENT ON COLUMN kliento_otp_codes.expires_at IS 'Expiration timestamp. OTPs are valid for 60 seconds after creation.';
COMMENT ON COLUMN kliento_otp_codes.attempt_count IS 'Number of failed verification attempts. OTP is invalidated after 3 failed attempts.';

ALTER TABLE kliento_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kliento_otp_codes_phone_number ON kliento_otp_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_kliento_otp_codes_project_config_id ON kliento_otp_codes(project_config_id);
CREATE INDEX IF NOT EXISTS idx_kliento_otp_codes_status_expires ON kliento_otp_codes(status, expires_at) WHERE status = 'valid';
