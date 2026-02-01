import React, { useState, useEffect, useCallback, useRef } from "react";
import { isAxiosError } from "axios";
import apiClient from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import {
  WishlistItem,
  WishlistContextType,
  WishlistContext,
  ApiWishlistItem,
} from "./WishlistContextTypes";
import { useAuth } from "./AuthContext";

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const refreshingRef = useRef(false);
  const pendingOperations = useRef<Set<string>>(new Set());
  const { user, loading: authLoading } = useAuth();

  const refreshWishlist = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      setIsLoading(true);
      const response = await apiClient.get("/wishlist");
      console.log("Raw wishlist response:", response.data);
      setWishlistItems(
        response.data.map((item: ApiWishlistItem) => ({
          id: item.product_id.toString(),
          name: item.product_name,
          price: item.product_price,
          location: item.product_location,
          category: item.product_category,
          images: item.product_image ? [{ image_url: item.product_image }] : [],
          wishlist_id: item.id,
          description: "",
          contact_phone: item.product_contact_phone,
          contact_email: null,
        })),
      );
      setWishlistCount(response.data.length);
    } catch (error: unknown) {
      // If unauthenticated, keep empty wishlist silently
      if (isAxiosError(error) && error.response?.status === 401) {
        setWishlistItems([]);
        setWishlistCount(0);
      } else {
        console.error("Failed to fetch wishlist:", error);
      }
    } finally {
      setIsLoading(false);
      refreshingRef.current = false;
    }
  }, []);

  const addToWishlist = async (productId: string | number) => {
    const pid = String(productId);
    const operationKey = `add-${pid}`;

    // Prevent duplicate simultaneous requests
    if (pendingOperations.current.has(operationKey)) {
      return;
    }

    pendingOperations.current.add(operationKey);

    try {
      // Optimistic update - add to wishlist immediately
      setWishlistCount(prev => prev + 1);

      // Add placeholder item to wishlistItems so isInWishlist returns true immediately
      setWishlistItems(prev => [...prev, {
        id: pid,
        name: "",
        price: 0,
        location: "",
        category: "",
        images: [],
        wishlist_id: -1, // Temporary ID
        description: "",
        contact_phone: null,
        contact_email: null,
      }]);

      await apiClient.post("/wishlist", { product_id: pid });

      toast({
        title: "Success",
        description: "Item added to wishlist",
      });
    } catch (error: unknown) {
      // Revert optimistic update on error
      setWishlistCount(prev => Math.max(0, prev - 1));
      setWishlistItems(prev => prev.filter(item => item.id !== pid));

      let message = "Failed to add item to wishlist";
      if (isAxiosError(error)) {
        if (error.response?.data?.message) {
          message = error.response.data.message;
        }
        // If already exists, refresh to show it
        if (error.response?.status === 409 || message.includes("already in wishlist")) {
          refreshWishlist();
        }
      }

      if (message.includes("already in wishlist")) {
        toast({
          title: "Info",
          description: "Item is already in your wishlist",
        });
      } else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      pendingOperations.current.delete(operationKey);
    }
  };

  const removeFromWishlist = async (id: number) => {
    try {
      // Optimistic update - remove from wishlist immediately
      setWishlistItems(prev => prev.filter(item => item.wishlist_id !== id));
      setWishlistCount(prev => Math.max(0, prev - 1));

      await apiClient.delete(`/wishlist/${id}`);

      toast({
        title: "Success",
        description: "Item removed from wishlist",
      });
    } catch (error: unknown) {
      // Revert optimistic update on error by refreshing
      refreshWishlist();

      let description = "Failed to remove item";
      if (isAxiosError(error) && error.response?.data?.message) {
        description = error.response.data.message;
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  const removeFromWishlistByProduct = async (productId: string | number) => {
    const pid = String(productId);
    const operationKey = `remove-${pid}`;

    // Prevent duplicate simultaneous requests
    if (pendingOperations.current.has(operationKey)) {
      return;
    }

    pendingOperations.current.add(operationKey);

    try {
      // Optimistic update - remove from wishlist immediately
      setWishlistItems(prev => prev.filter(item => item.id !== pid));
      setWishlistCount(prev => Math.max(0, prev - 1));

      await apiClient.delete(`/wishlist/product/${pid}`);

      toast({
        title: "Success",
        description: "Item removed from wishlist",
      });
    } catch (error: unknown) {
      // Revert optimistic update on error by refreshing
      refreshWishlist();

      let description = "Failed to remove item";
      if (isAxiosError(error) && error.response?.data?.message) {
        description = error.response.data.message;
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      pendingOperations.current.delete(operationKey);
    }
  };

  const isInWishlist = (productId: string | number): boolean => {
    return wishlistItems.some((item) => item.id === String(productId));
  };

  const checkWishlist = async (productId: string | number): Promise<boolean> => {
    try {
      const response = await apiClient.get(`/wishlist/check/${String(productId)}`);
      return response.data.in_wishlist;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      refreshWishlist();
    } else if (!user && !authLoading) {
      setWishlistItems([]);
      setWishlistCount(0);
    }
  }, [user, authLoading, refreshWishlist]);

  const clearWishlist = async () => {
    setIsLoading(true);
    try {
      await apiClient.delete("/wishlist/clear");
      await refreshWishlist();
      toast({
        title: "Success",
        description: "Wishlist cleared",
      });
    } catch (error: unknown) {
      let description = "Failed to clear wishlist";
      if (isAxiosError(error) && error.response?.data?.message) {
        description = error.response.data.message;
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        isLoading,
        addToWishlist,
        removeFromWishlist,
        removeFromWishlistByProduct,
        isInWishlist,
        checkWishlist,
        refreshWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
