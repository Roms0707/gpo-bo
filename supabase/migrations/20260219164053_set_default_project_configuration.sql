/*
  # Set default project configuration

  1. Changes
    - Sets the "Default Shard Arena Configuration" (config_id = 'default') as the default fallback
    - Clears its domain so it acts as a universal fallback when no domain matches
    - Sets is_default = true

  2. Impact
    - Fixes "No default configuration found" error in environments where hostname
      does not match any configured domain (e.g., WebContainer, localhost)
    - Ensures the app always has a configuration to fall back to

  3. Notes
    - The check_domain_default_exclusive constraint requires domain to be NULL
      when is_default is true, so domain is cleared in the same statement
*/

UPDATE project_configurations
SET domain = NULL, is_default = true
WHERE config_id = 'default';
