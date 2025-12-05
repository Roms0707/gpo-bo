/*
  # Add Read Tracking to Support Tickets

  1. Schema Changes
    - Add `first_opened_at` column to `support_tickets` table
      - Tracks when a ticket was first opened by an admin
      - Type: timestamptz (nullable)
      - NULL means the ticket has never been opened
    
    - Add `opened_by` column to `support_tickets` table
      - Tracks which admin first opened the ticket
      - Type: uuid (nullable)
      - Foreign key to users(id)
      - Sets to NULL if the admin user is deleted

  2. Indexes
    - Create index on `first_opened_at` for efficient filtering of unopened tickets
    - Create composite index on `status` and `first_opened_at` for counting queries

  3. Notes
    - These columns enable the notification system for unread support tickets
    - Admins are notified based on the ticket creator's country
    - The first admin to open a ticket marks it as "read"
*/

-- Add new columns to support_tickets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'first_opened_at'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN first_opened_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'opened_by'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN opened_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_support_tickets_first_opened_at ON support_tickets(first_opened_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_first_opened ON support_tickets(status, first_opened_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_opened_by ON support_tickets(opened_by);
