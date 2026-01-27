-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    credential_id TEXT,
    public_key TEXT,
    counter INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique ON user_roles(user_id, role);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    host_id INTEGER NOT NULL, -- Changed to INTEGER to match users.id
    status TEXT NOT NULL DEFAULT 'draft', -- draft, published, unpublished
    
    -- Property basics
    property_type TEXT,
    title TEXT,
    description TEXT,
    
    -- Location
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Cameroon',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    
    -- Pricing
    price_per_night DOUBLE PRECISION,
    currency TEXT DEFAULT 'XAF',
    cleaning_fee DOUBLE PRECISION,
    
    -- Capacity
    max_guests INTEGER,
    bedrooms INTEGER,
    beds INTEGER,
    bathrooms DOUBLE PRECISION,
    
    -- Booking settings
    instant_book BOOLEAN DEFAULT FALSE,
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER,
    
    -- Safety
    safety_devices TEXT, -- JSON array
    house_rules TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listings_host_id ON listings(host_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);

-- Listing amenities table
CREATE TABLE IF NOT EXISTS listing_amenities (
    id SERIAL PRIMARY KEY,
    listing_id TEXT NOT NULL,
    amenity_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    UNIQUE(listing_id, amenity_type)
);

CREATE INDEX IF NOT EXISTS idx_listing_amenities_listing_id ON listing_amenities(listing_id);

-- Listing photos table
CREATE TABLE IF NOT EXISTS listing_photos (
    id SERIAL PRIMARY KEY,
    listing_id TEXT NOT NULL,
    url TEXT NOT NULL,
    is_cover BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_id ON listing_photos(listing_id);

-- Listing videos table
CREATE TABLE IF NOT EXISTS listing_videos (
    id SERIAL PRIMARY KEY,
    listing_id TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_videos_listing_id ON listing_videos(listing_id);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    guest_id INTEGER NOT NULL, -- Changed to INTEGER to match users.id
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INTEGER NOT NULL,
    total_price DOUBLE PRECISION NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
