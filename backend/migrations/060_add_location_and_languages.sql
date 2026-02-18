-- Add location and languages_spoken columns to user_profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='location') THEN
        ALTER TABLE user_profiles ADD COLUMN location TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='languages_spoken') THEN
        ALTER TABLE user_profiles ADD COLUMN languages_spoken TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='bio') THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    END IF;
END $$;
