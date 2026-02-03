import React, { useEffect } from 'react';
import { useWishlist } from '@/hooks/useWishlist';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getImageUrl, formatPrice } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';
import { Heart } from 'lucide-react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import MobileNav from '@/components/MobileNav';
import Loading from '@/components/Loading';

const Wishlist: React.FC = () => {
    const { wishlistItems, removeFromWishlistByProduct, isLoading, refreshWishlist } = useWishlist();

    useEffect(() => {
        // Fetch once on mount; refreshWishlist is memoized in the provider
        refreshWishlist();
    }, [refreshWishlist]);

    if (isLoading) {
        return <Loading fullScreen message="Loading wishlist..." />;
    }

    return (
        <>
            <SEO
                title="My Wishlist"
                description={`View your ${wishlistItems.length} saved listings on Le Mboko.`}
            />
            <Header />
            <div className="container mx-auto px-4 py-8 pb-20 md:pb-8">
                <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>
                {wishlistItems.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-xl text-muted-foreground mb-4">Your wishlist is empty.</p>
                        <Button asChild>
                            <Link to="/">Start exploring</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {wishlistItems.map((item) => (
                            <div key={item.id} className="group relative">
                                <Link to={`/product/${item.id}`}>
                                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200">
                                        <OptimizedImage
                                            src={getImageUrl(item.images[0]?.image_url)}
                                            alt={item.name}
                                            className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity"
                                        />
                                    </div>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900 line-clamp-1">{item.name}</h3>
                                    <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-8 w-8 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeFromWishlistByProduct(item.id);
                                    }}
                                >
                                    <Heart className="h-5 w-5 fill-green-600 text-green-600" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div >
            <MobileNav />
        </>
    );
};

export default Wishlist;
