import { useContext } from 'react';
import { WishlistContext } from '@/contexts/WishlistContextTypes';

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};