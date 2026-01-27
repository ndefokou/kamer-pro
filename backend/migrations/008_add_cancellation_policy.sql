DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='cancellation_policy') THEN
        ALTER TABLE listings ADD COLUMN cancellation_policy TEXT;
    END IF;
END $$;
