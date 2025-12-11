-- Extra settings for account page
ALTER TABLE user_profiles ADD COLUMN notify_email INTEGER DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN notify_sms INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN privacy_profile_visibility TEXT DEFAULT 'everyone';
ALTER TABLE user_profiles ADD COLUMN tax_id TEXT;
ALTER TABLE user_profiles ADD COLUMN payout_method TEXT;
ALTER TABLE user_profiles ADD COLUMN travel_for_work INTEGER DEFAULT 0;
