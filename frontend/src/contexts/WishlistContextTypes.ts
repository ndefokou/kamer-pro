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
  product: Product;
}


export interface WishlistContextType {
  wishlistItems: WishlistItem[];
  wishlistCount: number;
  isLoading: boolean;
  addToWishlist: (productId: number) => Promise<void>;
  removeFromWishlist: (id: number) => Promise<void>;
  removeFromWishlistByProduct: (productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  checkWishlist: (productId: number) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

export const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);
