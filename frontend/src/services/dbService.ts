import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface AppDB extends DBSchema {
    listings: {
        key: string;
        value: {
            id: string;
            data: any;
            timestamp: number;
            ttl: number; // Time to live in milliseconds
        };
        indexes: { 'by-timestamp': number };
    };
    users: {
        key: number;
        value: {
            id: number;
            data: any;
            timestamp: number;
            ttl: number;
        };
    };
    messages: {
        key: string;
        value: {
            id: string;
            data: any;
            timestamp: number;
            ttl: number;
        };
    };
    bookings: {
        key: string;
        value: {
            id: string;
            data: any;
            timestamp: number;
            ttl: number;
        };
    };
    reviews: {
        key: string;
        value: {
            listingId: string;
            data: any[];
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
            id: string; // use 'all' as key
            data: any[];
            timestamp: number;
            ttl: number;
        };
    };
    conversations: {
        key: string;
        value: {
            id: string;
            data: any;
            timestamp: number;
            ttl: number;
        };
    };
}

const DB_NAME = 'kamer-pro-db';
const DB_VERSION = 1;

// Default TTL values (in milliseconds)
const TTL = {
    LISTINGS: 1000 * 60 * 30, // 30 minutes
    USERS: 1000 * 60 * 60, // 1 hour
    MESSAGES: 1000 * 60 * 5, // 5 minutes
    BOOKINGS: 1000 * 60 * 15, // 15 minutes
    REVIEWS: 1000 * 60 * 60, // 1 hour
    IMAGES: 1000 * 60 * 60 * 24, // 24 hours
    TOWNS: 1000 * 60 * 60 * 12, // 12 hours
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
    async cacheListing(id: string, data: any, ttl: number = TTL.LISTINGS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('listings', {
            id,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedListing(id: string): Promise<any | null> {
        const db = await this.ensureDB();
        const cached = await db.get('listings', id);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('listings', id);
            return null;
        }

        return cached.data;
    }

    async cacheListings(listings: any[], ttl: number = TTL.LISTINGS): Promise<void> {
        const db = await this.ensureDB();
        const tx = db.transaction('listings', 'readwrite');
        const now = Date.now();

        for (const item of listings) {
            const rawId = (item && (item.listing?.id ?? item.id)) as unknown;
            const id = typeof rawId === 'string' ? rawId : (rawId != null ? String(rawId) : '');
            if (!id) {
                // Skip entries without a valid id to avoid IndexedDB DataError
                continue;
            }
            await tx.store.put({
                id,
                data: item,
                timestamp: now,
                ttl,
            });
        }
        await tx.done;
    }

    async getAllCachedListings(): Promise<any[] | null> {
        const db = await this.ensureDB();
        const all = await db.getAll('listings');
        const now = Date.now();

        const results = all
            .filter(item => !this.isExpired(item.timestamp, item.ttl))
            .map(item => item.data);

        return results.length === 0 ? null : results;
    }

    // User operations
    async cacheUser(id: number, data: any, ttl: number = TTL.USERS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('users', {
            id,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedUser(id: number): Promise<any | null> {
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
    async cacheConversation(id: string, data: any, ttl: number = TTL.MESSAGES): Promise<void> {
        const db = await this.ensureDB();
        await db.put('messages', {
            id,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedConversation(id: string): Promise<any | null> {
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
    async cacheBooking(id: string, data: any, ttl: number = TTL.BOOKINGS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('bookings', {
            id,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedBooking(id: string): Promise<any | null> {
        const db = await this.ensureDB();
        const cached = await db.get('bookings', id);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('bookings', id);
            return null;
        }

        return cached.data;
    }

    async cacheBookings(bookings: any[], ttl: number = TTL.BOOKINGS): Promise<void> {
        const db = await this.ensureDB();
        const tx = db.transaction('bookings', 'readwrite');

        await Promise.all([
            ...bookings.map(booking =>
                tx.store.put({
                    id: booking.booking?.id || booking.id,
                    data: booking,
                    timestamp: Date.now(),
                    ttl,
                })
            ),
            tx.done,
        ]);
    }

    // Review operations
    async cacheReviews(listingId: string, data: any[], ttl: number = TTL.REVIEWS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('reviews', {
            listingId,
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedReviews(listingId: string): Promise<any[] | null> {
        const db = await this.ensureDB();
        const cached = await db.get('reviews', listingId);

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('reviews', listingId);
            return null;
        }

        return cached.data;
    }

    // Image caching operations
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
    async cacheTowns(data: any[], ttl: number = TTL.TOWNS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('towns', {
            id: 'all',
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedTowns(): Promise<any[] | null> {
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
    async cacheConversations(data: any[], ttl: number = TTL.CONVERSATIONS): Promise<void> {
        const db = await this.ensureDB();
        await db.put('conversations', {
            id: 'list',
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    async getCachedConversations(): Promise<any[] | null> {
        const db = await this.ensureDB();
        const cached = await db.get('conversations', 'list');

        if (!cached) return null;
        if (this.isExpired(cached.timestamp, cached.ttl)) {
            await db.delete('conversations', 'list');
            return null;
        }

        return cached.data;
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
                    // Handle different key types
                    let key: any;
                    if ('url' in item) {
                        key = item.url;
                    } else if ('listingId' in item) {
                        key = item.listingId;
                    } else {
                        key = item.id;
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

    async clearStore(storeName: any): Promise<void> {
        const db = await this.ensureDB();
        const names = Array.from(db.objectStoreNames) as string[];
        if (names.includes(storeName as string)) {
            await (db.clear as any)(storeName);
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
