import { createContext } from "react";

import { Product } from "./WishlistContextTypes";

export interface CartItem extends Product {
  quantity: number;
  cart_id: number;
}
export interface BackendCartItem {
  id: number;
  quantity: number;
  product: Product;
}


export interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  isLoading: boolean;
  addToCart: (productId: number, quantity: number) => Promise<void>;
  updateCartItem: (id: number, quantity: number) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getCartTotal: () => number;
}

export const CartContext = createContext<CartContextType | undefined>(
  undefined,
);
