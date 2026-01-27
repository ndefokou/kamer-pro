-- Add caption and room_type columns to listing_photos table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='listing_photos' AND column_name='caption') THEN
        ALTER TABLE listing_photos ADD COLUMN caption TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='listing_photos' AND column_name='room_type') THEN
        ALTER TABLE listing_photos ADD COLUMN room_type TEXT;
    END IF;
END $$;
