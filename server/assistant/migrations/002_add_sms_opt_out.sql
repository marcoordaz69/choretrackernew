-- Migration: Add SMS opt-out compliance field
-- Required for A2P Campaign compliance

ALTER TABLE assistant_users
ADD COLUMN sms_opted_out BOOLEAN DEFAULT false;

-- Create index for quick lookups of opted-out users
CREATE INDEX idx_users_sms_opted_out ON assistant_users(sms_opted_out);

-- Add comment
COMMENT ON COLUMN assistant_users.sms_opted_out IS 'User has opted out of SMS messages (STOP command). Required for A2P compliance.';
