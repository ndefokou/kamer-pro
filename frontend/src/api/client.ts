import axios from "axios";
import { dbService } from "../services/dbService";
import { networkService } from "../services/networkService";

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
});

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

// Helper to create cache key
const createCacheKey = (url: string, params?: any): string => {
  return `${url}${params ? '?' + JSON.stringify(params) : ''}`;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthPage = window.location.pathname.includes("/webauth-login");

    if (error.response && error.response.status === 401 && !isAuthPage && !error.config.url?.includes("/account/me")) {

      // Clear any stale auth data
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");

      // Redirect to login, preserving the intended destination
      const current = `${window.location.pathname}${window.location.search}`;
      const redirect = encodeURIComponent(current || "/");
      window.location.href = `/webauth-login?redirect=${redirect}`;

    } else if (error.response && error.response.status === 401 && isAuthPage) {
      console.log("Session check failed on auth page, this is expected.");
    }

    return Promise.reject(error);
  }
);

// Enhanced GET with caching
const cachedGet = async <T = any>(url: string, config?: any): Promise<T> => {
  const cacheKey = createCacheKey(url, config?.params);

  // Check for pending request (deduplication)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      // Try network first if online and good connection
      if (navigator.onLine && !networkService.isSlowConnection()) {
        const response = await apiClient.get(url, config);

        // Cache the response
        await cacheResponse(url, response.data, config?.params);

        return response.data;
      }

      // For slow connections or offline, try cache first
      const cached = await getCachedResponse(url, config?.params);
      if (cached) {
        // Fetch in background to update cache
        apiClient.get(url, config)
          .then(response => cacheResponse(url, response.data, config?.params))
          .catch(() => { }); // Silently fail background update

        return cached;
      }

      // No cache, try network
      const response = await apiClient.get(url, config);
      await cacheResponse(url, response.data, config?.params);
      return response.data;

    } catch (error) {
      // Network failed, try cache as fallback
      const cached = await getCachedResponse(url, config?.params);
      if (cached) {
        console.log('Using cached data due to network error:', url);
        return cached;
      }
      throw error;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

// Cache response based on URL
const cacheResponse = async (url: string, data: any, params?: any): Promise<void> => {
  try {
    if (url.includes('/listings/') && !url.includes('/reviews') && !url.includes('/my-listings')) {
      // Single listing
      const id = url.split('/listings/')[1].split('/')[0];
      await dbService.cacheListing(id, data);
    } else if (url === '/listings' || url.includes('/listings/host/')) {
      // Multiple listings
      if (Array.isArray(data)) {
        await dbService.cacheListings(data);
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
    }
  } catch (error) {
    console.error('Failed to cache response:', error);
  }
};

// Get cached response based on URL
const getCachedResponse = async (url: string, params?: any): Promise<any | null> => {
  try {
    if (url.includes('/listings/') && !url.includes('/reviews') && !url.includes('/my-listings')) {
      // Single listing
      const id = url.split('/listings/')[1].split('/')[0];
      return await dbService.getCachedListing(id);
    } else if (url === '/listings' || url.includes('/listings/host/')) {
      // Multiple listings
      return await dbService.getAllCachedListings();
    } else if (url.includes('/account/user/')) {
      // User data
      const id = parseInt(url.split('/account/user/')[1]);
      return await dbService.getCachedUser(id);
    } else if (url.includes('/reviews')) {
      // Reviews
      const listingId = url.split('/listings/')[1].split('/reviews')[0];
      return await dbService.getCachedReviews(listingId);
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
  const response = await apiClient.get("/listings/towns");
  return response.data;
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
  const response = await apiClient.get("/listings/my-listings");
  return response.data;
};

export const getListing = async (id: string): Promise<Product> => {
  return await cachedGet<Product>(`/listings/${id}`);
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
  const response = await apiClient.get(`/listings/host/${hostId}`);
  return response.data;
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
  const response = await apiClient.get("/messages/conversations");
  return response.data;
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const response = await apiClient.get(`/messages/conversations/${conversationId}`);
  return response.data;
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

export type BookingStatus = 'pending' | 'confirmed' | 'declined';
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
