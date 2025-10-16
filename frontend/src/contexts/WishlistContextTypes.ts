import { createContext } from 'react';

export interface WishlistItem {
  id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  product_image: string | null;
  product_location: string;
  product_category: string;
  product_status: string;
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

export const WishlistContext = createContext<WishlistContextType | undefined>(undefined);