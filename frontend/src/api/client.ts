import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { decode as msgpackDecode } from "@msgpack/msgpack";
import { dbService } from "../services/dbService";
import { networkService } from "../services/networkService";
import { queryClient } from "../App";

const getBaseUrl = () => {
  // Prefer explicit backend origin if provided; fall back to legacy VITE_API_URL, then to site-relative /api
  const raw = (import.meta.env.VITE_BACKEND_URL as string | undefined)
    || (import.meta.env.VITE_API_URL as string | undefined)
    || "/api";

  // Remove trailing slash if present to avoid double slashes
  const clean = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  // If it's already ending with /api, keep it; otherwise append /api
  return clean.endsWith("/api") ? clean : `${clean}/api`;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

// Request deduplication map
const pendingRequests = new Map<string, Promise<unknown>>();

// Cache update listeners
type CacheListener = (url: string, data: unknown) => void;
const cacheListeners = new Set<CacheListener>();
const lastBackgroundFetch = new Map<string, number>();
const BG_FETCH_COOLDOWN = 60000; // 1 minute

export const subscribeToCache = (listener: CacheListener) => {
  cacheListeners.add(listener);
  return () => cacheListeners.delete(listener);
};

const notifyCacheUpdate = (url: string, data: unknown) => {
  cacheListeners.forEach(listener => listener(url, data));
};

// Helper to create cache key
const createCacheKey = (url: string, params?: Record<string, unknown>): string => {
  return `${url}${params ? '?' + JSON.stringify(params) : ''}`;
};

// Request interceptor to add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
        // Ensure next fetch isn't throttled by background cooldown
        try { lastBackgroundFetch.clear(); } catch { /* noop */ }

        // If it's a publication, we want to be very aggressive with resetting queries
        if (url.endsWith('/publish')) {
          queryClient.resetQueries({ queryKey: ['products'] });
        }
      } else if (url.includes('/calendar')) {
        // Calendar changes affect listing availability displayed to guests
        dbService.clearCacheByPattern('listings');

        // Broadcast calendar availability change to other tabs and within the app
        try {
          // Extract listingId from /calendar/:listingId/...
          const match = url.match(/\/calendar\/([^/]+)/);
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
          const delay = Math.min(500 * 2 ** (cfg.__retryCount - 1), 3000);
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

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  skipCache?: boolean;
  forceNetwork?: boolean;
  params?: Record<string, unknown>;
}

// Perform GET requesting compact binary (MessagePack) when available and decode response
const getWithBinary = async (url: string, config?: CustomAxiosRequestConfig): Promise<unknown> => {
  const headers = {
    ...(config?.headers || {}),
    Accept: "application/json", // Force JSON for stability debugging
    // Accept: "application/x-msgpack, application/msgpack, application/json", 
  } as Record<string, string>;

  try {
    // Add cache-busting timestamp if skipCache or forceNetwork is set
    // This helps bypass browser/proxy caches for critical requests
    let finalUrl = url;
    if (config?.skipCache || config?.forceNetwork) {
      const char = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${char}_=${Date.now()}`;
    }

    // Use standard JSON request for now
    const response = await apiClient.get(finalUrl, {
      ...config,
      headers,
    } as AxiosRequestConfig);

    if (!response.data) {
      console.warn('getWithBinary: Received empty data for', url);
      return null;
    }

    console.log(`getWithBinary: Success for ${url}. Data type: ${typeof response.data}. IsArray: ${Array.isArray(response.data)}`);
    if (Array.isArray(response.data)) {
      console.log(`getWithBinary: Array length: ${response.data.length}`);
    }

    return response.data;
  } catch (error) {
    console.error('getWithBinary: Error fetching', url, error);
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data;
    }
    throw error;
  }
};



// Enhanced GET with caching that prioritizes Supabase
const cachedGet = async <T = unknown>(url: string, config?: CustomAxiosRequestConfig): Promise<T> => {
  const cacheKey = createCacheKey(url, config?.params);
  const isOnline = navigator.onLine && networkService.getNetworkInfo().isOnline;

  // Check for pending request (deduplication)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T>;
  }

  const requestPromise = (async () => {
    try {
      // When online, always try to fetch from Supabase first
      if (isOnline) {
        try {
          // Force network request by skipping cache
          const data = await getWithBinary(url, { ...config, skipCache: true });

          // Cache the fresh data in the background for offline use
          if (!config?.skipCache) {
            cacheResponse(url, data, config?.params).catch(console.error);
          }

          return data as T;
        } catch (networkError) {
          console.warn('Supabase request failed, falling back to cache:', url, networkError);
          // Continue to cache fallback
        }
      }

      // Try cache as fallback when offline or when Supabase request failed
      const cached = await getCachedResponse(url, config?.params as Record<string, unknown> | undefined) as T | null;

      if (cached) {
        // If we have cached data and we're offline, return it
        if (!isOnline) {
          console.log('Using cached data (offline mode):', url);
          return cached;
        }

        // If we're online but the Supabase request failed, return cached data with a warning
        console.warn('Using cached data (Supabase request failed):', url);
        return cached;
      }

      // If we have no cache and we're offline, throw an error
      if (!isOnline) {
        throw new Error('You are currently offline and no cached data is available.');
      }

      // This should only be reached if we're online but both Supabase and cache failed
      throw new Error('Unable to fetch data. Please check your connection and try again.');

    } catch (error) {
      // If we have a network error but we're actually online, try one more time
      if (isOnline && axios.isAxiosError(error) && !error.response) {
        try {
          console.log('Retrying Supabase request...');
          const data = await getWithBinary(url, { ...config, skipCache: true });

          // Update cache with the fresh data
          if (!config?.skipCache) {
            cacheResponse(url, data, config?.params).catch(console.error);
          }

          return data as T;
        } catch (retryError) {
          console.error('Retry failed:', retryError);

          // If we still fail but have cached data, use it as a last resort
          const cached = await getCachedResponse(url, config?.params as Record<string, unknown> | undefined) as T | null;
          if (cached) {
            console.warn('Using cached data after retry failure:', url);
            return cached;
          }

          throw new Error('Unable to fetch data. Please check your connection and try again.');
        }
      }
      throw error;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise as Promise<unknown>);
  return requestPromise as Promise<T>;
};

// Cache response based on URL
const cacheResponse = async (url: string, data: unknown, params?: Record<string, unknown> | undefined): Promise<void> => {
  try {
    // Skip caching for large datasets or when explicitly disabled
    if (params?.skipCache) return;

    if (url.includes('/listings/') && !url.includes('/reviews') && !url.includes('/my-listings')) {
      // Single listing - only cache if it has essential data
      const listing = data as any;
      if (listing && listing.id) {
        await dbService.cacheListing(listing.id, listing);
      }
    } else if (url === '/listings' || url.includes('/listings/host/') || url === '/listings/my-listings') {
      // Multiple listings - only cache first page
      if (Array.isArray(data) && (!params?.offset || params.offset === 0)) {
        // Limit the number of listings to cache (first 20)
        const listingsToCache = (data as any[]).slice(0, 20);
        if (listingsToCache.length > 0) {
          await dbService.cacheListings(listingsToCache);

          // Only store minimal data in localStorage for critical listings
          if (url === '/listings' && !params?.search && !params?.location && !params?.category) {
            const minimalListings = listingsToCache.map(({ id, title, price, image_urls, location }) => ({
              id,
              title,
              price,
              image_urls,
              location
            }));
            localStorage.setItem('critical_listings', JSON.stringify(minimalListings));
          }
        }
      }
    } else if (url.includes('/account/user/')) {
      // User data - only cache basic user info
      const userData = data as any;
      if (userData && userData.id) {
        const { id, email, username, avatar_url } = userData;
        await dbService.cacheUser(id, { id, email, username, avatar_url });
      }
    } else if (url.includes('/reviews')) {
      // Reviews - limit to first 10
      const listingId = url.split('/listings/')[1].split('/reviews')[0];
      const reviews = Array.isArray(data) ? (data as any[]).slice(0, 10) : [];
      if (reviews.length > 0) {
        await dbService.cacheReviews(listingId, reviews);
      }
    } else if (url.includes('/bookings') && Array.isArray(data)) {
      // Bookings - limit to first 10
      const bookings = (data as any[]).slice(0, 10);
      if (bookings.length > 0) {
        await dbService.cacheBookings(bookings);
      }
    } else if (url === '/listings/towns' && Array.isArray(data)) {
      // Towns - limit to first 50
      await dbService.cacheTowns((data as any[]).slice(0, 50));
    } else if (url === '/messages/conversations' && Array.isArray(data)) {
      // Conversations - limit to first 20
      await dbService.cacheConversations((data as any[]).slice(0, 20));
    } else if (url.includes('/messages/conversations/')) {
      // Single conversation - limit messages to last 50
      const conversation = data as any;
      if (conversation?.messages && Array.isArray(conversation.messages)) {
        const limitedConversation = {
          ...conversation,
          messages: conversation.messages.slice(-50) // Only keep last 50 messages
        };
        const id = url.split('/messages/conversations/')[1];
        await dbService.cacheConversation(id, limitedConversation);
      }
    }
  } catch (error) {
    console.error('Failed to cache response:', error);
  }
};

// Get cached response based on URL
interface CachedListing {
  id: string;
  title: string;
  price: number;
  image_urls: string[];
  location: string;
  description?: string;
  rating?: number;
  review_count?: number;
  created_at?: string;
  updated_at?: string;
}

const getCachedResponse = async (url: string, params?: Record<string, unknown>): Promise<unknown | null> => {
  try {
    if (url.includes('/listings/') && !url.includes('/reviews') && !url.includes('/my-listings')) {
      // Single listing
      const id = url.split('/listings/')[1].split('/')[0];
      const cached = await dbService.getCachedListing(id) as CachedListing | null;
      // Only return if it's a valid listing with essential data
      if (cached && cached.id && cached.title && cached.price !== undefined) {
        return cached;
      }
      return null;
    } else if (url === '/listings' || url.includes('/listings/host/') || url === '/listings/my-listings') {
      // Multiple listings
      // For general /listings with filters or pagination, don't return ALL cached listings
      if (
        url === '/listings' &&
        params &&
        (
          params.search ||
          params.location ||
          params.category ||
          params.guests ||
          typeof (params as any).offset === 'number' ||
          typeof (params as any).limit === 'number'
        )
      ) {
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
