import React, { createContext, useContext, useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import apiClient from '@/api/client';
import { useToast } from '@/hooks/use-toast';

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

interface WishlistContextType {
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

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const refreshWishlist = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await apiClient.get('/wishlist');
      setWishlistItems(response.data);
      setWishlistCount(response.data.length);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    }
  };

  const addToWishlist = async (productId: number) => {
    setIsLoading(true);
    try {
      await apiClient.post('/wishlist', { product_id: productId });
      await refreshWishlist();
      toast({
        title: 'Success',
        description: 'Item added to wishlist',
      });
    } catch (error: unknown) {
      let message = 'Failed to add item to wishlist';
      if (isAxiosError(error) && error.response?.data?.message) {
        message = error.response.data.message;
      }

      if (message.includes('already in wishlist')) {
        toast({
          title: 'Info',
          description: 'Item is already in your wishlist',
        });
      } else {
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
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
        title: 'Success',
        description: 'Item removed from wishlist',
      });
    } catch (error: unknown) {
      let description = 'Failed to remove item';
      if (isAxiosError(error) && error.response?.data?.message) {
        description = error.response.data.message;
      }
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
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
        title: 'Success',
        description: 'Item removed from wishlist',
      });
    } catch (error: unknown) {
      let description = 'Failed to remove item';
      if (isAxiosError(error) && error.response?.data?.message) {
        description = error.response.data.message;
      }
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isInWishlist = (productId: number): boolean => {
    return wishlistItems.some(item => item.product_id === productId);
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
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
