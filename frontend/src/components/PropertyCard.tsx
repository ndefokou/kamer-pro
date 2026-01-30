import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/useWishlist";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl, formatPrice } from "@/lib/utils";
import OptimizedImage from "./OptimizedImage";

interface PropertyCardProps {
    id: string;
    name: string;
    location: string;
    price: number;
    images: { image_url: string }[];
    rating?: number;
    isGuestFavorite?: boolean;
}

const PropertyCard = ({
    id,
    name,
    location,
    price,
    images,
    rating,
    isGuestFavorite = false,
}: PropertyCardProps) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { isInWishlist, addToWishlist, removeFromWishlistByProduct } = useWishlist();
    const { toast } = useToast();
    const inWishlist = isInWishlist(id);

    const handleWishlistToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const productId = id;
            if (inWishlist) {
                await removeFromWishlistByProduct(productId);
            } else {
                await addToWishlist(productId);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update wishlist",
                variant: "destructive",
            });
        }
    };

    const hasMultipleImages = images && images.length > 1;

    return (
        <Link
            to={`/product/${id}`}
            className="block flex-shrink-0 w-full sm:w-[280px] group cursor-pointer"
        >
            <div className="flex flex-col h-full">
                {/* Image Container */}
                <div className="relative aspect-[20/19] sm:aspect-square rounded-xl overflow-hidden bg-muted mb-3">
                    {images && images.length > 0 ? (
                        <OptimizedImage
                            src={getImageUrl(images[currentImageIndex]?.image_url)}
                            alt={name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <span className="text-sm">No image</span>
                        </div>
                    )}

                    {/* Guest Favorite Badge */}
                    {isGuestFavorite && (
                        <div className="absolute top-3 left-3 z-10">
                            <span className="px-3 py-1 text-xs font-bold bg-white/90 backdrop-blur-sm text-foreground rounded-full shadow-sm flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                Guest favorite
                            </span>
                        </div>
                    )}

                    {/* Wishlist Heart */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full hover:bg-white/90 hover:scale-110 transition-all p-0 focus:ring-0"
                        onClick={handleWishlistToggle}
                    >
                        <Heart
                            className={`h-6 w-6 transition-colors ${inWishlist
                                ? "fill-green-600 text-green-600"
                                : "fill-black/50 text-white stroke-[2px]"
                                }`}
                        />
                    </Button>

                    {/* Image Dots */}
                    {hasMultipleImages && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {images.slice(0, 5).map((_, index) => (
                                <button
                                    key={index}
                                    className={`h-1.5 rounded-full transition-all shadow-sm ${index === currentImageIndex
                                        ? "w-1.5 bg-white scale-125"
                                        : "w-1.5 bg-white/60 hover:bg-white/80"
                                        }`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setCurrentImageIndex(index);
                                    }}
                                    aria-label={`View image ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Gradient Overlay for text readability if needed */}
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Property Info */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[15px] text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {location}
                        </h3>
                        {rating && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="h-3 w-3 fill-current text-foreground" />
                                <span className="text-sm text-foreground">{rating.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-1">{name}</p>

                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-semibold text-[15px] text-foreground">
                            {formatPrice(price)}
                        </span>
                        <span className="text-sm text-muted-foreground">/ night</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default PropertyCard;
