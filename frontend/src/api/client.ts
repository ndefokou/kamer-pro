import axios from "axios";
import { dbService } from "../services/dbService";
import { networkService } from "../services/networkService";
import { queryClient } from "../App";

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return "/api";
  // Remove trailing slash if present to avoid double slashes
  const cleanUrl = envUrl.replace(/\/$/, "");
  return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  timeout: 15000,
});

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

// Cache update listeners
type CacheListener = (url: string, data: any) => void;
const cacheListeners = new Set<CacheListener>();
const lastBackgroundFetch = new Map<string, number>();
const BG_FETCH_COOLDOWN = 60000; // 1 minute

export const subscribeToCache = (listener: CacheListener) => {
  cacheListeners.add(listener);
  return () => cacheListeners.delete(listener);
};

const notifyCacheUpdate = (url: string, data: any) => {
  cacheListeners.forEach(listener => listener(url, data));
};

// Helper to create cache key
const createCacheKey = (url: string, params?: any): string => {
  return `${url}${params ? '?' + JSON.stringify(params) : ''}`;
};

// Request interceptor to add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Adaptive timeout per request based on network quality (fail fast on poor connections)
    try {
      const quality = networkService.getCurrentInfo().quality;
      const timeout = quality === 'poor' ? 6000 : quality === 'moderate' ? 10000 : 15000;
      config.timeout = Math.max(3000, timeout);
    } catch (_e) {
      void 0;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Retry helper for transient GET failures
const __shouldRetryGet = (error: unknown) => {
  const err = error as import('axios').AxiosError;
  const cfg = err?.config;
  if (!cfg) return false;
  const method = (cfg.method || '').toLowerCase();
  if (method !== 'get') return false;
  const status = err.response?.status;
  return !status || status === 408 || status === 429 || (status >= 500 && status < 600);
};

apiClient.interceptors.response.use(
  (response) => {
    // Global Cache Invalidation for Mutations
    const { method, url } = response.config;
    if (method && ['post', 'put', 'delete'].includes(method.toLowerCase()) && url) {
      if (url.includes('/listings')) {
        dbService.clearCacheByPattern('listings');
      } else if (url.includes('/calendar')) {
        // Calendar changes affect listing availability displayed to guests
        dbService.clearCacheByPattern('listings');

        // Broadcast calendar availability change to other tabs and within the app
        try {
          // Extract listingId from /calendar/:listingId/...
          const match = url.match(/\/calendar\/([^\/]+)/);
          const listingId = match ? match[1] : undefined;

          // 1) Cross-tab broadcast
          if (typeof BroadcastChannel !== 'undefined' && listingId) {
            const bc = new BroadcastChannel('calendar-updates');
            bc.postMessage({ type: 'calendar_updated', listingId });
            bc.close();
          }

          // 2) Intra-tab event
          if (listingId) {
            window.dispatchEvent(new CustomEvent('calendar_updated', { detail: { listingId } }));
          }
        } catch { /* noop */ }
      } else if (url.includes('/bookings')) {
        dbService.clearCacheByPattern('bookings');
      } else if (url.includes('/messages')) {
        dbService.clearCacheByPattern('messages');
      } else if (url.includes('/account/user')) {
        dbService.clearCacheByPattern('users');
      }

      // Automatically invalidate react-query queries
      queryClient.invalidateQueries();
    }
    return response;
  },
  (error) => {
    // Lightweight exponential backoff retries for GETs on flaky networks
    try {
      const cfg: import('axios').AxiosRequestConfig & { __retryCount?: number } = (error?.config || {}) as any;
      if (__shouldRetryGet(error)) {
        cfg.__retryCount = (cfg.__retryCount || 0) + 1;
        const quality = networkService.getCurrentInfo().quality;
        const maxRetries = quality === 'poor' ? 2 : quality === 'moderate' ? 2 : 3;
        if (cfg.__retryCount <= maxRetries) {
          const delay = Math.min(1000 * 2 ** (cfg.__retryCount - 1), 5000);
          return new Promise((resolve) => setTimeout(resolve, delay)).then(() => apiClient.request(cfg));
        }
      }
    } catch (_e) {
      void 0;
    }
    const isAuthPage = window.location.hash.includes('#/login');

    // Suppress 401 for session check - return "not logged in" state without error
    if (error.response && error.response.status === 401 && error.config && error.config.url && error.config.url.includes('/account/me')) {
      return Promise.resolve({ data: { user: null, profile: null } });
    }

    if (error.response && error.response.status === 401 && !isAuthPage) {
      // Clear any stale auth data
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');

      // Redirect to login, preserving the intended destination (hash-based routing)
      const current = window.location.hash || '#/';
      const redirect = encodeURIComponent(current);
      window.location.href = `#/login?redirect=${redirect}`;

    } else if (error.response && error.response.status === 401 && isAuthPage) {
      console.log('Session check failed on auth page, this is expected.');
    }

    return Promise.reject(error);
  }
);

// Enhanced GET with caching
const cachedGet = async <T = any>(url: string, config?: any): Promise<T> => {
  const cacheKey = createCacheKey(url, config?.params);

  // Check for pending request (deduplication)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T>;
  }

  const requestPromise = (async () => {
    try {
      // 1. Ultra-fast Synchronous Cache (LocalStorage) for Critical Paths
      // Only for general listings (no search, location, category, or guests filters)
      const hasFilters = config?.params?.search || config?.params?.location || config?.params?.category || config?.params?.guests;
      // Home page uses a specific large limit and no filters
      if (url === '/listings' && !hasFilters && config?.params?.limit > 20 && !config?.params?.offset) {
        const criticalData = localStorage.getItem('critical_listings');
        if (criticalData) {
          try {
            const parsed = JSON.parse(criticalData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Fetch update in background
              apiClient.get(url, config).then(res => {
                if (res.data && res.data.length > 0) {
                  localStorage.setItem('critical_listings', JSON.stringify(res.data.slice(0, 10)));
                }
                cacheResponse(url, res.data, config?.params);
              }).catch(() => undefined);
              return parsed;
            }
          } catch (e) { }
        }
      }

      // 2. Try IndexedDB cache second (Stale-While-Revalidate pattern)
      const cachedUnknown = await getCachedResponse(url, config?.params as Record<string, unknown> | undefined);
      const cached = cachedUnknown as T | null;

      if (cached && (!Array.isArray(cached) || cached.length > 0)) {
        // Fetch in background to update cache without blocking the UI
        // Only if we haven't fetched in the last minute
        const lastFetch = lastBackgroundFetch.get(cacheKey) || 0;
        if (Date.now() - lastFetch > BG_FETCH_COOLDOWN) {
          lastBackgroundFetch.set(cacheKey, Date.now());
          apiClient.get(url, config)
            .then(response => {
              cacheResponse(url, response.data, config?.params);
              notifyCacheUpdate(url, response.data);

              // Invalidate queries to refresh UI with fresh data
              queryClient.invalidateQueries();
            })
            .catch(() => {
              // Reset cooldown on error to allow retry
              lastBackgroundFetch.delete(cacheKey);
            });
        }

        return cached;
      }

      // If no cache, fetch from network
      const response = await apiClient.get(url, config);
      await cacheResponse(url, response.data, config?.params);
      return response.data;

    } catch (error) {
      // Network failed, try cache as fallback
      const cached = (await getCachedResponse(url, config?.params as Record<string, unknown> | undefined)) as T | null;
      if (cached) {
        console.log('Using cached data due to network error:', url);
        return cached;
      }
      throw error;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise as Promise<any>);
  return requestPromise;
};

// Cache response based on URL
const cacheResponse = async (url: string, data: any, params?: any): Promise<void> => {
  try {
    if (url.includes('/listings/') && !url.includes('/reviews') && !url.includes('/my-listings')) {
      // Single listing
      const id = url.split('/listings/')[1].split('/')[0];
      await dbService.cacheListing(id, data);
    } else if (url === '/listings' || url.includes('/listings/host/') || url === '/listings/my-listings') {
      // Multiple listings
      if (Array.isArray(data)) {
        await dbService.cacheListings(data);
        // Save first page of general listings to localStorage for ultra-fast initial paint
        if (url === '/listings' && (!params?.offset || params.offset === 0) && data.length > 0) {
          localStorage.setItem('critical_listings', JSON.stringify(data.slice(0, 10)));
        }
      }
    } else if (url.includes('/account/user/')) {
      // User data
      const id = parseInt(url.split('/account/user/')[1]);
      await dbService.cacheUser(id, data);
    } else if (url.includes('/reviews')) {
      // Reviews
      const listingId = url.split('/listings/')[1].split('/reviews')[0];
      await dbService.cacheReviews(listingId, data);
    } else if (url.includes('/bookings')) {
      // Bookings
      if (Array.isArray(data)) {
        await dbService.cacheBookings(data);
      }
    } else if (url === '/listings/towns') {
      // Towns
      if (Array.isArray(data)) {
        await dbService.cacheTowns(data);
      }
    } else if (url === '/messages/conversations') {
      // Conversations
      if (Array.isArray(data)) {
        await dbService.cacheConversations(data);
      }
    } else if (url.includes('/messages/conversations/')) {
      // Single conversation/messages
      const id = url.split('/messages/conversations/')[1];
      await dbService.cacheConversation(id, data);
    }
  } catch (error) {
    console.error('Failed to cache response:', error);
  }
};

// Get cached response based on URL
const getCachedResponse = async (url: string, params?: Record<string, unknown>): Promise<unknown | null> => {
  try {
    if (url.includes('/listings/') && !url.includes('/reviews') && !url.includes('/my-listings')) {
      // Single listing
      const id = url.split('/listings/')[1].split('/')[0];
      const cached = await dbService.getCachedListing(id);
      // Only return if it's a "full" listing (has description or safety_items or something marketplace lacks)
      if (cached && cached.listing && (cached.listing.description || cached.listing.safety_devices)) {
        return cached;
      }
      return null;
    } else if (url === '/listings' || url.includes('/listings/host/') || url === '/listings/my-listings') {
      // Multiple listings
      // For general /listings with filters, don't return ALL cached listings
      if (url === '/listings' && params && (params.search || params.location || params.category || params.guests)) {
        return null;
      }
      return await dbService.getAllCachedListings();
    } else if (url.includes('/account/user/')) {
      // User data
      const id = parseInt(url.split('/account/user/')[1]);
      return await dbService.getCachedUser(id);
    } else if (url.includes('/reviews')) {
      // Reviews
      const listingId = url.split('/listings/')[1].split('/reviews')[0];
      return await dbService.getCachedReviews(listingId);
    } else if (url === '/listings/towns') {
      return await dbService.getCachedTowns();
    } else if (url === '/messages/conversations') {
      return await dbService.getCachedConversations();
    } else if (url.includes('/messages/conversations/')) {
      const id = url.split('/messages/conversations/')[1];
      return await dbService.getCachedConversation(id);
    }
  } catch (error) {
    console.error('Failed to get cached response:', error);
  }
  return null;
};

export const getRoles = async () => {
  const response = await apiClient.get("/roles");
  return response.data;
};

export const addRole = async (role: string) => {
  const response = await apiClient.post("/roles", { role });
  return response.data;
};

export const removeRole = async (role: string) => {
  const response = await apiClient.delete(`/roles/${role}`);
  return response.data;
};

export default apiClient;

export interface Product {
  listing: {
    id: string;
    host_id: number;
    status: string;
    property_type?: string;
    title?: string;
    description?: string;
    address?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    price_per_night?: number;
    currency?: string;
    cleaning_fee?: number;
    max_guests?: number;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    instant_book?: number;
    min_nights?: number;
    max_nights?: number;
    safety_devices?: string;
    house_rules?: string;
    created_at?: string;
    updated_at?: string;
    published_at?: string;
    getting_around?: string;
    scenic_views?: string;
    cancellation_policy?: string;
  };
  amenities: string[];
  host_avatar?: string | null;
  host_username?: string | null;
  photos: {
    id: number;
    listing_id: string;
    url: string;
    is_cover: number;
    display_order: number;
    uploaded_at?: string;
  }[];
  videos: {
    id: number;
    listing_id: string;
    url: string;
    uploaded_at?: string;
  }[];
  unavailable_dates?: {
    check_in: string;
    check_out: string;
  }[];
  contact_phone?: string | null;
}

export interface TownCount {
  city: string;
  count: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  location?: string;
  min_price?: string;
  max_price?: string;
  guests?: number;
  date?: string;
  limit?: number;
  offset?: number;
}

export const getProducts = async (filters: ProductFilters): Promise<Product[]> => {
  const params = { ...filters };
  if (params.min_price === "") delete params.min_price;
  if (params.max_price === "") delete params.max_price;

  // Adjust page size based on network quality
  const networkInfo = networkService.getCurrentInfo();
  if (!params.limit) {
    params.limit = networkService.getRecommendedPageSize();
  }

  // Map frontend filters to backend query params
  const queryParams: Record<string, string | number> = {};
  if (params.search) queryParams.search = params.search;
  if (params.category) queryParams.category = params.category;
  if (params.location) queryParams.location = params.location;
  if (params.min_price) queryParams.min_price = params.min_price;
  if (params.max_price) queryParams.max_price = params.max_price;
  if (params.guests) queryParams.guests = params.guests;
  if (params.date) queryParams.date = params.date;
  if (typeof params.limit === 'number') queryParams.limit = params.limit;
  if (typeof params.offset === 'number') queryParams.offset = params.offset;

  return await cachedGet<Product[]>("/listings", { params: queryParams });
};

export const getTowns = async (): Promise<TownCount[]> => {
  return await cachedGet<TownCount[]>("/listings/towns");
};

export interface CreateProductData {
  category?: string;
}

export const createProduct = async (productData: CreateProductData): Promise<Product> => {
  // Map product data to listing data
  const listingData = {
    property_type: productData.category,
  };
  const response = await apiClient.post("/listings", listingData);
  return response.data;
};

export const getMyProducts = async () => {
  return await cachedGet<Product[]>("/listings/my-listings");
};

export const getListing = async (id: string): Promise<Product> => {
  return await cachedGet<Product>(`/listings/${id}`);
};

// Force fresh fetch of a single listing, bypassing SWR/IndexedDB cache.
// Use this on correctness-sensitive pages (e.g., booking) to reflect immediate availability changes.
export const getListingFresh = async (id: string): Promise<Product> => {
  const response = await apiClient.get(`/listings/${id}`);
  // Keep local cache in sync for subsequent loads
  try {
    await cacheResponse(`/listings/${id}`, response.data, undefined);
  } catch (e) {
    // swallow cache errors
  }
  return response.data;
};

export const deleteListing = async (id: string) => {
  const response = await apiClient.delete(`/listings/${id}`);
  return response.data;
};

// Reviews API (listings)
export interface ListingReview {
  id: number;
  listing_id: string;
  guest_id: number;
  ratings?: string | Record<string, number>;
  comment?: string | null;
  created_at?: string | null;
  username?: string | null;
  avatar?: string | null;
}

export const getListingReviews = async (listingId: string): Promise<ListingReview[]> => {
  return await cachedGet<ListingReview[]>(`/listings/${listingId}/reviews`);
};

export const addListingReview = async (
  listingId: string,
  payload: { ratings: Record<string, number>; comment?: string },
) => {
  const response = await apiClient.post(`/listings/${listingId}/reviews`, payload);
  return response.data as ListingReview;
};

// Account API
export interface AccountUser {
  id: number;
  username: string;
  email: string;
}

export interface AccountProfile {
  legal_name?: string | null;
  preferred_first_name?: string | null;
  phone?: string | null;
  avatar?: string | null;
}

export interface AccountResponse {
  user?: AccountUser | null;
  profile?: AccountProfile | null;
}

export const getUserById = async (id: number): Promise<AccountResponse> => {
  return await cachedGet<AccountResponse>(`/account/user/${id}`);
};

export const getHostListings = async (hostId: number): Promise<Product[]> => {
  return await cachedGet<Product[]>(`/listings/host/${hostId}`);
};

// Messaging API
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

export const createConversation = async (listingId: string, hostId: number, message: string) => {
  const response = await apiClient.post("/messages/conversations", {
    listing_id: listingId,
    host_id: hostId,
    message,
  });
  return response.data;
};

export const getConversations = async (): Promise<Conversation[]> => {
  return await cachedGet<Conversation[]>("/messages/conversations");
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  return await cachedGet<Message[]>(`/messages/conversations/${conversationId}`);
};

export const sendMessage = async (conversationId: string, content: string) => {
  const response = await apiClient.post("/messages", {
    conversation_id: conversationId,
    content,
  });
  return response.data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const response = await apiClient.get("/messages/unread-count");
  return response.data;
};

export interface CreateBookingData {
  listing_id: string;
  check_in: string;
  check_out: string;
  guests: number;
}

export const createBooking = async (bookingData: CreateBookingData) => {
  const response = await apiClient.post("/bookings", bookingData);
  return response.data;
};

export const approveBooking = async (bookingId: string) => {
  const response = await apiClient.post(`/bookings/${bookingId}/approve`);
  return response.data;
};

export const declineBooking = async (bookingId: string, reason: string) => {
  const response = await apiClient.post(`/bookings/${bookingId}/decline`, { reason });
  return response.data;
};

export const cancelBooking = async (bookingId: string) => {
  const response = await apiClient.post(`/bookings/${bookingId}/cancel`);
  return response.data;
};

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

export const getMyBookings = async (): Promise<BookingWithDetails[]> => {
  return await cachedGet<BookingWithDetails[]>('/bookings/my');
};

// Report API
export interface CreateReportData {
  host_id: number;
  listing_id?: string;
  reason: string;
}

export const createReport = async (reportData: CreateReportData) => {
  const response = await apiClient.post("/reports", reportData);
  return response.data;
};

// Admin API
export interface AdminHost {
  id: number;
  username: string;
  email: string;
  created_at: string;
  listing_count: number;
}

export interface AdminReport {
  id: number;
  reporter_id: number;
  host_id: number;
  listing_id?: string;
  reason: string;
  status: string;
  created_at: string;
}

export const getAdminHosts = async (): Promise<AdminHost[]> => {
  const response = await apiClient.get("/admin/hosts");
  return response.data;
};

export const deleteHost = async (hostId: number) => {
  const response = await apiClient.delete(`/admin/hosts/${hostId}`);
  return response.data;
};

export const getAdminReports = async (): Promise<AdminReport[]> => {
  const response = await apiClient.get("/admin/reports");
  return response.data;
};
