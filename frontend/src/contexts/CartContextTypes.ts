import { createContext } from "react";

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  product_name: string;
  product_price: number;
  product_image: string | null;
  product_location: string;
  product_status: string;
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
