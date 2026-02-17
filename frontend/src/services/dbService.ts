import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface AppDB extends DBSchema {
    listings: {
        key: string;
        value: {
            id: string;
            data: unknown;
            timestamp: number;
            ttl: number;
        };
        indexes: { 'by-timestamp': number };
    };
    users: {
        key: number;
        value: {
            id: number;
            data: unknown;
            timestamp: number;
            ttl: number;
        };
    };
    messages: {
        key: string;
        value: {
            id: string;
            data: unknown;
            timestamp: number;
            ttl: number;
        };
    };
    bookings: {
        key: string;
        value: {
            id: string;
            data: unknown;
            timestamp: number;
            ttl: number;
        };
    };
    reviews: {
        key: string;
        value: {
            listingId: string;
            data: unknown[];
            timestamp: number;
            ttl: number;
        };
    };
    images: {
        key: string;
        value: {
            url: string;
            blob: Blob;
            timestamp: number;
            ttl: number;
        };
    };
    towns: {
        key: string;
        value: {
            id: string;
            data: unknown[];
            timestamp: number;
            ttl: number;
        };
    };
    conversations: {
        key: string;
        value: {
            id: string;
            data: unknown[];
            timestamp: number;
            ttl: number;
        };
    };
}

const DB_NAME = 'kamer-pro-db';
const DB_VERSION = 1;

// Default TTL values (in milliseconds)
const TTL = {
    LISTINGS: 1000 * 60 * 15, // 15 minutes
    USERS: 1000 * 60 * 30, // 30 minutes
    MESSAGES: 1000 * 60 * 5, // 5 minutes
    BOOKINGS: 1000 * 60 * 10, // 10 minutes
    REVIEWS: 1000 * 60 * 30, // 30 minutes
    IMAGES: 1000 * 60 * 60, // 1 hour
    TOWNS: 1000 * 60 * 60, // 1 hour
    CONVERSATIONS: 1000 * 60 * 5, // 5 minutes
};

class DatabaseService {
    private db: IDBPDatabase<AppDB> | null = null;

    async init(): Promise<void> {
        if (this.db) return;

        this.db = await openDB<AppDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Listings store
                if (!db.objectStoreNames.contains('listings')) {
                    const listingStore = db.createObjectStore('listings', { keyPath: 'id' });
                    listingStore.createIndex('by-timestamp', 'timestamp');
                }

                // Users store
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' });
                }

                // Messages store
                if (!db.objectStoreNames.contains('messages')) {
                    db.createObjectStore('messages', { keyPath: 'id' });
                }

                // Bookings store
                if (!db.objectStoreNames.contains('bookings')) {
                    db.createObjectStore('bookings', { keyPath: 'id' });
                }

                // Reviews store
                if (!db.objectStoreNames.contains('reviews')) {
                    db.createObjectStore('reviews', { keyPath: 'listingId' });
                }

                // Images store
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images', { keyPath: 'url' });
                }

                // Towns store
                if (!db.objectStoreNames.contains('towns')) {
                    db.createObjectStore('towns', { keyPath: 'id' });
                }

                // Conversations store
                if (!db.objectStoreNames.contains('conversations')) {
                    db.createObjectStore('conversations', { keyPath: 'id' });
                }
            },
        });
    }

    private async ensureDB(): Promise<IDBPDatabase<AppDB>> {
        if (!this.db) {
            await this.init();
        }
        return this.db!;
    }

    // Generic cache operations
    private isExpired(timestamp: number, ttl: number): boolean {
        return Date.now() - timestamp > ttl;
    }

    // Listings operations
    async cacheListing(id: string, data: unknown, ttl: number = TTL.LISTINGS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('listings', {
            id,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedListing(id: string): Promise<unknown | null> {
        const db = await this.ensureDB();
        const cached = await db.get('listings', id);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('listings', id);
            return null;
        }

        return cached.data;
    }

    async cacheListings(listings: unknown[], ttl: number = TTL.LISTINGS): Promise<void> {
        const db = await this.ensureDB();
        const tx = db.transaction('listings', 'readwrite');
        const now = Date.now();

        for (const item of listings as Record<string, unknown>[]) {
            const id = (item.id as string) || (item.listing ? (item.listing as Record<string, unknown>).id as string : undefined);
            if (!id) continue;

            // Normalize data for storage
            let essentialData: Record<string, unknown>;
            if (item.listing) {
                // It's a Product object
                const listing = item.listing as Record<string, unknown>;
                const photos = (item.photos as Array<Record<string, unknown>>) || [];
                essentialData = {
                    id,
                    title: listing.title,
                    price: listing.price_per_night,
                    image_urls: photos.map(p => p.url),
                    location: listing.city,
                    description: listing.description,
                    created_at: listing.created_at,
                    updated_at: listing.updated_at
                };
            } else {
                // It's already simplified or another format
                essentialData = { ...item, id };
            }

            await tx.store.put({
                id,
                data: essentialData,
                timestamp: now,
                ttl,
            });
        }
        await tx.done;
    }

    async getAllCachedListings(): Promise<unknown[] | null> {
        const db = await this.ensureDB();
        const all = await db.getAll('listings');
        const now = Date.now();

        const results = all
            .filter(item => !this.isExpired(item.timestamp, item.ttl))
            .map(item => item.data);

        return results.length === 0 ? null : results;
    }

    // User operations
    async cacheUser(id: number, data: unknown, ttl: number = TTL.USERS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('users', {
            id,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedUser(id: number): Promise<unknown | null> {
        const db = await this.ensureDB();
        const cached = await db.get('users', id);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('users', id);
            return null;
        }

        return cached.data;
    }

    // Message operations
    async cacheConversation(id: string, data: unknown, ttl: number = TTL.MESSAGES): Promise<void> {
        const db = await this.ensureDB();
        await db.put('messages', {
            id,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedConversation(id: string): Promise<unknown | null> {
        const db = await this.ensureDB();
        const cached = await db.get('messages', id);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('messages', id);
            return null;
        }

        return cached.data;
    }

    // Booking operations
    async cacheBooking(id: string, data: unknown, ttl: number = TTL.BOOKINGS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('bookings', {
            id,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedBooking(id: string): Promise<unknown | null> {
        const db = await this.ensureDB();
        const cached = await db.get('bookings', id);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('bookings', id);
            return null;
        }

        return cached.data;
    }

    async cacheBookings(bookings: unknown[], ttl: number = TTL.BOOKINGS): Promise<void> {
        const db = await this.ensureDB();
        const tx = db.transaction('bookings', 'readwrite');
        const now = Date.now();

        for (const booking of bookings as Record<string, unknown>[]) {
            const id = (booking.id as string) || (booking.booking ? (booking.booking as Record<string, unknown>).id as string : undefined);
            if (!id) continue;

            let essentialData: Record<string, unknown>;
            if (booking.booking) {
                // BookingWithDetails
                const b = booking.booking as Record<string, unknown>;
                essentialData = {
                    id,
                    listing_id: b.listing_id,
                    user_id: b.guest_id, // Note: backend uses guest_id
                    start_date: b.check_in,
                    end_date: b.check_out,
                    status: b.status,
                    total_price: b.total_price,
                    created_at: b.created_at,
                    updated_at: b.updated_at
                };
            } else {
                essentialData = { ...booking, id } as Record<string, unknown>;
            }

            await tx.store.put({
                id,
                data: essentialData,
                timestamp: now,
                ttl,
            });
        }
        await tx.done;
    }

    // Review operations
    async cacheReviews(listingId: string, reviews: unknown[], ttl: number = TTL.REVIEWS): Promise<void> {
        const db = await this.ensureDB();
        const essentialReviews = (reviews as Array<Record<string, unknown>>).map(review => ({
            id: review.id,
            user_id: review.guest_id || review.user_id,
            username: review.username,
            avatar: review.avatar || review.avatar_url,
            preferred_first_name: review.preferred_first_name,
            legal_name: review.legal_name,
            rating: review.ratings || review.rating,
            comment: review.comment,
            created_at: review.created_at
        }));

        await db.put('reviews', {
            listingId,
            data: essentialReviews,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedReviews(listingId: string): Promise<unknown[] | null> {
        const db = await this.ensureDB();
        const cached = await db.get('reviews', listingId);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('reviews', listingId);
            return null;
        }

        return cached.data;
    }

    // Image operations
    async cacheImage(url: string, blob: Blob, ttl: number = TTL.IMAGES): Promise<void> {
        const db = await this.ensureDB();
        await db.put('images', {
            url,
            blob,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedImage(url: string): Promise<Blob | null> {
        const db = await this.ensureDB();
        const cached = await db.get('images', url);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('images', url);
            return null;
        }

        return cached.blob;
    }

    // Towns operations
    async cacheTowns(data: unknown[], ttl: number = TTL.TOWNS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('towns', {
            id: 'all',
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedTowns(): Promise<unknown[] | null> {
        const db = await this.ensureDB();
        const cached = await db.get('towns', 'all');

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('towns', 'all');
            return null;
        }

        return cached.data;
    }

    // Conversation list operations
    async cacheConversations(data: unknown[], ttl: number = TTL.CONVERSATIONS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('conversations', {
            id: 'list',
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedConversations(): Promise<unknown[] | null> {
        const db = await this.ensureDB();
        const cached = await db.get('conversations', 'list');

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('conversations', 'list');
            return null;
        }

        return cached.data as unknown[];
    }

    // Cleanup operations
    async clearExpiredCache(): Promise<void> {
        const db = await this.ensureDB();
        const stores = ['listings', 'users', 'messages', 'bookings', 'reviews', 'images'] as const;

        for (const storeName of stores) {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const all = await store.getAll();

            for (const item of all) {
                if (this.isExpired(item.timestamp, item.ttl)) {
                    let key: string | number;
                    if ('url' in item) {
                        key = (item as { url: string }).url;
                    } else if ('listingId' in item) {
                        key = (item as { listingId: string }).listingId;
                    } else {
                        key = (item as { id: string | number }).id;
                    }
                    await store.delete(key);
                }
            }
            await tx.done;
        }
    }

    async clearAllCache(): Promise<void> {
        const db = await this.ensureDB();
        const stores = ['listings', 'users', 'messages', 'bookings', 'reviews', 'images', 'towns', 'conversations'] as const;

        for (const storeName of stores) {
            await db.clear(storeName);
        }
        localStorage.removeItem('critical_listings');
    }

    async clearStore(storeName: string): Promise<void> {
        const db = await this.ensureDB();
        const names = Array.from(db.objectStoreNames) as string[];
        if (names.includes(storeName)) {
            await db.clear(storeName as "listings" | "users" | "messages" | "bookings" | "reviews" | "images" | "towns" | "conversations");
        }
    }

    async clearCacheByPattern(pattern: string): Promise<void> {
        if (pattern === 'listings') {
            await this.clearStore('listings');
            await this.clearStore('towns');
            localStorage.removeItem('critical_listings');
        } else if (pattern === 'bookings') {
            await this.clearStore('bookings');
        } else if (pattern === 'messages') {
            await this.clearStore('messages');
            await this.clearStore('conversations');
        } else if (pattern === 'users') {
            await this.clearStore('users');
        }
    }

    async getCacheStats(): Promise<{
        listings: number;
        users: number;
        messages: number;
        bookings: number;
        reviews: number;
        images: number;
    }> {
        const db = await this.ensureDB();

        return {
            listings: await db.count('listings'),
            users: await db.count('users'),
            messages: await db.count('messages'),
            bookings: await db.count('bookings'),
            reviews: await db.count('reviews'),
            images: await db.count('images'),
        };
    }
}

// Export singleton instance
export const dbService = new DatabaseService();

// Initialize on module load
dbService.init().catch(console.error);

export default dbService;
