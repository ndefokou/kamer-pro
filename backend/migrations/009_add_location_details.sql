DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='getting_around') THEN
        ALTER TABLE listings ADD COLUMN getting_around TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='scenic_views') THEN
        ALTER TABLE listings ADD COLUMN scenic_views TEXT;
    END IF;
END $$;
