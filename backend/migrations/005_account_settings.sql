-- Extra settings for account page
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='notify_email') THEN
        ALTER TABLE user_profiles ADD COLUMN notify_email BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='notify_sms') THEN
        ALTER TABLE user_profiles ADD COLUMN notify_sms BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='privacy_profile_visibility') THEN
        ALTER TABLE user_profiles ADD COLUMN privacy_profile_visibility TEXT DEFAULT 'everyone';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='tax_id') THEN
        ALTER TABLE user_profiles ADD COLUMN tax_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='payout_method') THEN
        ALTER TABLE user_profiles ADD COLUMN payout_method TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='travel_for_work') THEN
        ALTER TABLE user_profiles ADD COLUMN travel_for_work BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
