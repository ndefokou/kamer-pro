import { createContext } from "react";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location: string;
  contact_phone: string | null;
  contact_email: string | null;
  images: { image_url: string }[];
  created_at?: string;
}

export interface WishlistItem extends Product {
  wishlist_id: number;
}
export interface ApiWishlistItem {
  id: number;
  product_id: string;
  product_name: string;
  product_price: number;
  product_location: string;
  product_category: string;
  product_image: string | null;
  product_contact_phone: string | null;
}

export interface WishlistContextType {
  wishlistItems: WishlistItem[];
  wishlistCount: number;
  isLoading: boolean;
  addToWishlist: (productId: string | number) => Promise<void>;
  removeFromWishlist: (id: number) => Promise<void>;
  removeFromWishlistByProduct: (productId: string | number) => Promise<void>;
  isInWishlist: (productId: string | number) => boolean;
  checkWishlist: (productId: string | number) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
  clearWishlist: () => Promise<void>;
}

export const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);
