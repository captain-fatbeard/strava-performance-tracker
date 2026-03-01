-- Add birthday column to user_settings (replaces age slider with date input)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS birthday TEXT DEFAULT NULL;
