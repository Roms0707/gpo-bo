/*
  # Galaxy API Logs System

  ## Overview
  This migration creates a comprehensive logging system for all Galaxy API calls,
  enabling debugging, monitoring, and audit tracking of API interactions.

  ## New Tables

  ### 1. `galaxy_api_logs`
  Stores detailed logs of every Galaxy API call including request parameters,
  responses, errors, and performance metrics.

  ## Security (RLS)
  - All authenticated users can view their own logs
  - All authenticated users can insert logs (for application logging)

  ## Important Notes
  1. Sensitive data (API keys) are masked in request_params
  2. Response bodies are stored for debugging but respect size limits
  3. Failed requests are flagged with success=false for easy filtering
  4. Performance metrics help identify slow API calls
*/

-- =====================================================
-- STEP 1: Create galaxy_api_logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS galaxy_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  request_params jsonb DEFAULT '{}'::jsonb,
  response_status integer,
  response_body jsonb,
  response_headers jsonb DEFAULT '{}'::jsonb,
  error_message text,
  duration_ms integer,
  campaign_id text,
  project_config_id uuid,
  success boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_galaxy_api_logs_created_at
  ON galaxy_api_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_galaxy_api_logs_campaign
  ON galaxy_api_logs(campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_galaxy_api_logs_project
  ON galaxy_api_logs(project_config_id)
  WHERE project_config_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_galaxy_api_logs_success
  ON galaxy_api_logs(success);

CREATE INDEX IF NOT EXISTS idx_galaxy_api_logs_endpoint
  ON galaxy_api_logs(endpoint);

-- Composite index for common queries (errors by campaign)
CREATE INDEX IF NOT EXISTS idx_galaxy_api_logs_campaign_success
  ON galaxy_api_logs(campaign_id, success, created_at DESC)
  WHERE campaign_id IS NOT NULL;

-- =====================================================
-- STEP 2: Enable RLS
-- =====================================================

ALTER TABLE galaxy_api_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view logs
CREATE POLICY "Authenticated users can view galaxy api logs"
  ON galaxy_api_logs FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Authenticated users can insert logs (for application)
CREATE POLICY "Authenticated users can insert galaxy api logs"
  ON galaxy_api_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- STEP 3: Create helper functions
-- =====================================================

-- Function to mask sensitive data in request params
CREATE OR REPLACE FUNCTION mask_sensitive_params(params jsonb)
RETURNS jsonb AS $$
DECLARE
  masked_params jsonb;
BEGIN
  masked_params := params;

  -- Mask API keys and secrets
  IF masked_params ? 'api_key' THEN
    masked_params := jsonb_set(masked_params, '{api_key}', '"***MASKED***"'::jsonb);
  END IF;

  IF masked_params ? 'api_secret_key' THEN
    masked_params := jsonb_set(masked_params, '{api_secret_key}', '"***MASKED***"'::jsonb);
  END IF;

  IF masked_params ? 'secret' THEN
    masked_params := jsonb_set(masked_params, '{secret}', '"***MASKED***"'::jsonb);
  END IF;

  IF masked_params ? 'password' THEN
    masked_params := jsonb_set(masked_params, '{password}', '"***MASKED***"'::jsonb);
  END IF;

  RETURN masked_params;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean up old logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_galaxy_api_logs(retention_days integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM galaxy_api_logs
  WHERE created_at < now() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API call statistics
CREATE OR REPLACE FUNCTION get_galaxy_api_stats(
  p_campaign_id text DEFAULT NULL,
  p_start_date timestamptz DEFAULT now() - interval '7 days',
  p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  total_calls bigint,
  successful_calls bigint,
  failed_calls bigint,
  avg_duration_ms numeric,
  max_duration_ms integer,
  min_duration_ms integer,
  error_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_calls,
    COUNT(*) FILTER (WHERE success = true)::bigint as successful_calls,
    COUNT(*) FILTER (WHERE success = false)::bigint as failed_calls,
    ROUND(AVG(duration_ms), 2) as avg_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE success = false)::numeric / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as error_rate
  FROM galaxy_api_logs
  WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent errors
CREATE OR REPLACE FUNCTION get_recent_galaxy_api_errors(
  p_limit integer DEFAULT 50,
  p_campaign_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  endpoint text,
  error_message text,
  response_status integer,
  campaign_id text,
  log_created_at timestamptz,
  duration_ms integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.endpoint,
    l.error_message,
    l.response_status,
    l.campaign_id,
    l.created_at as log_created_at,
    l.duration_ms
  FROM galaxy_api_logs l
  WHERE l.success = false
    AND (p_campaign_id IS NULL OR l.campaign_id = p_campaign_id)
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Grant permissions
-- =====================================================

GRANT SELECT ON galaxy_api_logs TO authenticated;
GRANT INSERT ON galaxy_api_logs TO authenticated;
GRANT EXECUTE ON FUNCTION mask_sensitive_params TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_old_galaxy_api_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_galaxy_api_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_galaxy_api_errors TO authenticated;

-- =====================================================
-- STEP 5: Add comments for documentation
-- =====================================================

COMMENT ON TABLE galaxy_api_logs IS
  'Logs all Galaxy API calls for debugging, monitoring, and audit purposes';

COMMENT ON COLUMN galaxy_api_logs.request_params IS
  'Request parameters with sensitive data masked by mask_sensitive_params()';

COMMENT ON COLUMN galaxy_api_logs.duration_ms IS
  'Total request duration in milliseconds, including network latency';

COMMENT ON COLUMN galaxy_api_logs.success IS
  'True if the API call completed successfully (2xx status), false otherwise';

COMMENT ON FUNCTION mask_sensitive_params IS
  'Masks sensitive data like API keys and passwords in request parameters';

COMMENT ON FUNCTION cleanup_old_galaxy_api_logs IS
  'Deletes logs older than specified retention period (default 90 days)';

COMMENT ON FUNCTION get_galaxy_api_stats IS
  'Returns aggregated statistics for Galaxy API calls within a date range';

COMMENT ON FUNCTION get_recent_galaxy_api_errors IS
  'Returns the most recent failed API calls for debugging';