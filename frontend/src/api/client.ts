import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login if token is invalid/expired
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");

      // Only redirect if we are not already on the login page to avoid loops
      if (!window.location.pathname.includes("/webauth-login")) {
        const current = `${window.location.pathname}${window.location.search}`;
        const redirect = encodeURIComponent(current || "/");
        window.location.href = `/webauth-login?redirect=${redirect}`;
      }
    }
    return Promise.reject(error);
  }
);

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
  };
  amenities: string[];
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
}

export interface ProductFilters {
  search?: string;
  category?: string;
  location?: string;
  min_price?: string;
  max_price?: string;
  guests?: number;
  date?: string;
}

export const getProducts = async (filters: ProductFilters): Promise<Product[]> => {
  const params = { ...filters };
  if (params.min_price === "") delete params.min_price;
  if (params.max_price === "") delete params.max_price;

  // Map frontend filters to backend query params
  const queryParams: Record<string, string | number> = {};
  if (params.search) queryParams.search = params.search;
  if (params.category) queryParams.category = params.category;
  if (params.location) queryParams.location = params.location;
  if (params.min_price) queryParams.min_price = params.min_price;
  if (params.max_price) queryParams.max_price = params.max_price;
  if (params.guests) queryParams.guests = params.guests;
  if (params.date) queryParams.date = params.date;

  const response = await apiClient.get("/listings", { params: queryParams });
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
