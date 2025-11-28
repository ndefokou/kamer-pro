import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (userId) {
    config.headers["x-user-id"] = userId;
  }

  return config;
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
        window.location.href = "/";
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

export interface ProductFilters {
  search?: string;
  category?: string;
  location?: string;
  condition?: string;
  min_price?: string;
  max_price?: string;
}

export const getProducts = async (filters: ProductFilters) => {
  const params = { ...filters };
  if (params.min_price === "") {
    delete params.min_price;
  }
  if (params.max_price === "") {
    delete params.max_price;
  }
  const response = await apiClient.get("/products", { params });
  return response.data;
};

export const createProduct = async (productData: any) => {
  const response = await apiClient.post("/products", productData);
  return response.data;
};

export const getMyProducts = async () => {
  const response = await apiClient.get("/products/seller");
  return response.data;
};
