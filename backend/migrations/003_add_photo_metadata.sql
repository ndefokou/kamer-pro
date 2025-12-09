-- Add caption and room_type columns to listing_photos table
ALTER TABLE listing_photos ADD COLUMN caption TEXT;
ALTER TABLE listing_photos ADD COLUMN room_type TEXT;
