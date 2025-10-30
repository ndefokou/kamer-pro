import React, { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import apiClient from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import {
  WishlistItem,
  WishlistContextType,
  WishlistContext,
  ApiWishlistItem,
} from "./WishlistContextTypes";

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const refreshWishlist = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
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
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
    }
  };

  const addToWishlist = async (productId: number) => {
    setIsLoading(true);
    try {
      await apiClient.post("/wishlist", { product_id: productId });
      await refreshWishlist();
      toast({
        title: "Success",
        description: "Item added to wishlist",
      });
    } catch (error: unknown) {
      let message = "Failed to add item to wishlist";
      if (isAxiosError(error) && error.response?.data?.message) {
        message = error.response.data.message;
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
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (id: number) => {
    setIsLoading(true);
    try {
      await apiClient.delete(`/wishlist/${id}`);
      await refreshWishlist();
      toast({
        title: "Success",
        description: "Item removed from wishlist",
      });
    } catch (error: unknown) {
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
      setIsLoading(false);
    }
  };

  const removeFromWishlistByProduct = async (productId: number) => {
    setIsLoading(true);
    try {
      await apiClient.delete(`/wishlist/product/${productId}`);
      await refreshWishlist();
      toast({
        title: "Success",
        description: "Item removed from wishlist",
      });
    } catch (error: unknown) {
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
      setIsLoading(false);
    }
  };

  const isInWishlist = (productId: number): boolean => {
    return wishlistItems.some((item) => parseInt(item.id) === productId);
  };

  const checkWishlist = async (productId: number): Promise<boolean> => {
    try {
      const response = await apiClient.get(`/wishlist/check/${productId}`);
      return response.data.in_wishlist;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, []);

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
