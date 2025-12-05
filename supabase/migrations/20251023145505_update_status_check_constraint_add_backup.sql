/*
  # Update tournament_registrations status constraint to include 'backup'

  1. Schema Changes
    - Drop existing check constraint on status column
    - Add new check constraint that includes 'backup' status
    - Existing statuses: 'pending', 'approved', 'rejected'
    - New status: 'backup'

  2. Notes
    - This migration completes the backup players system by allowing the 'backup' status in the database
    - The constraint was created but not updated in the previous migration
*/

-- Drop the old constraint
ALTER TABLE tournament_registrations 
DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;

-- Add the new constraint with backup status included
ALTER TABLE tournament_registrations
ADD CONSTRAINT tournament_registrations_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'backup'));
