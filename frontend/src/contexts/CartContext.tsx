import React, { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import apiClient from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import {
  CartContext,
  CartItem,
  BackendCartItem,
} from "./CartContextTypes";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const refreshCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await apiClient.get("/cart");
      setCartItems(
        response.data.map((item: BackendCartItem) => ({
          id: item.product_id.toString(),
          name: item.product_name,
          price: item.product_price,
          location: item.product_location,
          images: item.product_image ? [{ image_url: item.product_image }] : [],
          description: "",
          category: "",
          contact_phone: null,
          contact_email: null,
          quantity: item.quantity,
          cart_id: item.id,
        })),
      );
      setCartCount(response.data.length);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    }
  };

  const addToCart = async (productId: number, quantity: number = 1) => {
    setIsLoading(true);
    try {
      await apiClient.post("/cart", { product_id: productId, quantity });
      await refreshCart();
      toast({
        title: "Success",
        description: "Item added to cart",
      });
    } catch (error) {
      let errorMessage = "Failed to add item to cart";
      if (
        isAxiosError(error) &&
        typeof error.response?.data?.message === "string"
      ) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCartItem = async (id: number, quantity: number) => {
    setIsLoading(true);
    const originalCartItems = [...cartItems];
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.cart_id === id ? { ...item, quantity } : item,
      ),
    );

    try {
      await apiClient.put(`/cart/${id}`, { quantity });
      toast({
        title: "Success",
        description: "Cart updated",
      });
    } catch (error) {
      setCartItems(originalCartItems);
      let errorMessage = "Failed to update cart";
      if (
        isAxiosError(error) &&
        typeof error.response?.data?.message === "string"
      ) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (id: number) => {
    setIsLoading(true);
    const originalCartItems = [...cartItems];
    setCartItems((prevItems) => prevItems.filter((item) => item.cart_id !== id));
    setCartCount((prevCount) => prevCount - 1);

    try {
      await apiClient.delete(`/cart/${id}`);
      toast({
        title: "Success",
        description: "Item removed from cart",
      });
    } catch (error) {
      setCartItems(originalCartItems);
      let errorMessage = "Failed to remove item";
      if (
        isAxiosError(error) &&
        typeof error.response?.data?.message === "string"
      ) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    const originalCartItems = [...cartItems];
    setCartItems([]);
    setCartCount(0);

    try {
      await apiClient.delete("/cart");
      toast({
        title: "Success",
        description: "Cart cleared",
      });
    } catch (error) {
      let errorMessage = "Failed to clear cart";
      if (
        isAxiosError(error) &&
        typeof error.response?.data?.message === "string"
      ) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return total + price * quantity;
    }, 0);
  };

  useEffect(() => {
    refreshCart();
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        isLoading,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        refreshCart,
        getCartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
