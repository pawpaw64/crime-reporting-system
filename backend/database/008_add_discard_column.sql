-- Migration: Add is_discarded column to complaint table
-- This allows tracking of discarded/deleted cases for analytics

ALTER TABLE complaint 
ADD COLUMN is_discarded BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_complaint_discarded ON complaint(is_discarded);

-- Add discarded_at timestamp to track when case was discarded
ALTER TABLE complaint 
ADD COLUMN discarded_at TIMESTAMP NULL;

-- Add discarded_by to track which admin discarded the case
ALTER TABLE complaint 
ADD COLUMN discarded_by VARCHAR(50) NULL,
ADD FOREIGN KEY (discarded_by) REFERENCES admins(username) ON DELETE SET NULL;
