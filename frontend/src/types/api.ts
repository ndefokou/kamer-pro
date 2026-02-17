export interface User {
    id: string | number;
    username: string;
    email: string;
    profile_picture_url?: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    role?: string;
}

export interface Listing {
    id: string;
    title: string;
    description: string;
    price_per_night: number;
    city: string;
    country: string;
    address: string;
    guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    property_type: string;
    host_id: string;
    created_at: string;
    updated_at: string;
    status: string;
    latitude?: number;
    longitude?: number;
    max_guests?: number;
    getting_around?: string;
    scenic_views?: string;
    safety_devices?: string;
    house_rules?: string;
    cancellation_policy?: string;
}

export interface ListingPhoto {
    id: number;
    listing_id: string;
    url: string;
    caption?: string;
    room_type?: string;
    is_cover: boolean;
    display_order: number;
    uploaded_at?: string;
}

export interface ListingVideo {
    id: number;
    listing_id: string;
    url: string;
    uploaded_at?: string;
}

export interface UnavailableDateRange {
    check_in: string;
    check_out: string;
}

export interface Product {
    listing: Listing;
    photos: ListingPhoto[];
    amenities: string[];
    videos: ListingVideo[];
    safety_items: string[];
    unavailable_dates: UnavailableDateRange[];
    contact_phone?: string;
    host_avatar?: string;
    host_username?: string;
}

export interface ProductFilters {
    search?: string;
    category?: string;
    location?: string;
    min_price?: string | number;
    max_price?: string | number;
    guests?: number;
    date?: string;
    limit?: number;
    offset?: number;
}

export interface TownCount {
    city: string;
    count: number;
}

export interface ListingReview {
    id: number;
    listing_id: string;
    guest_id: number;
    ratings?: string | Record<string, number>;
    comment?: string | null;
    created_at?: string | null;
    username?: string | null;
    avatar?: string | null;
    preferred_first_name?: string | null;
    legal_name?: string | null;
}

export interface Booking {
    id: string;
    listing_id: string;
    guest_id: number;
    check_in: string;
    check_out: string;
    status: string;
    total_price: number;
    created_at: string;
    updated_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';

export interface BookingWithDetails {
    booking: {
        id: string;
        listing_id: string;
        guest_id: number;
        check_in: string;
        check_out: string;
        guests: number;
        total_price: number;
        status: BookingStatus;
        created_at?: string;
        updated_at?: string;
    };
    guest_name: string;
    guest_email: string;
    listing_title: string;
    listing_photo?: string | null;
    listing_city?: string | null;
    listing_country?: string | null;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: number;
    content: string;
    read_at?: string;
    created_at: string;
}

export interface Conversation {
    conversation: {
        id: string;
        listing_id: string;
        guest_id: number;
        host_id: number;
        created_at: string;
        updated_at: string;
    };
    last_message?: Message;
    other_user: {
        id: number;
        name: string;
        avatar?: string;
    };
    listing_title: string;
    listing_image?: string;
}
