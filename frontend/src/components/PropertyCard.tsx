import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/useWishlist";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/utils";

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
    const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
    const { toast } = useToast();
    const inWishlist = isInWishlist(parseInt(id, 10));

    const handleWishlistToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const productId = parseInt(id, 10);
            if (inWishlist) {
                await removeFromWishlist(productId);
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
            className="block flex-shrink-0 w-[280px] group"
        >
            <div className="mb-3">
                {/* Image Container */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200">
                    {images && images.length > 0 ? (
                        <img
                            src={getImageUrl(images[currentImageIndex]?.image_url)}
                            alt={name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <span className="text-gray-400">No image</span>
                        </div>
                    )}

                    {/* Guest Favorite Badge */}
                    {isGuestFavorite && (
                        <div className="absolute top-3 left-3">
                            <span className="px-3 py-1 text-xs font-semibold bg-white rounded-full shadow-sm flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                Guest favorite
                            </span>
                        </div>
                    )}

                    {/* Wishlist Heart */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-white/90 transition-colors p-0"
                        onClick={handleWishlistToggle}
                    >
                        <Heart
                            className={`h-5 w-5 ${inWishlist
                                ? "fill-[#FF385C] text-[#FF385C]"
                                : "fill-black/10 text-white stroke-2"
                                }`}
                        />
                    </Button>

                    {/* Image Dots */}
                    {hasMultipleImages && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                            {images.map((_, index) => (
                                <button
                                    key={index}
                                    className={`h-1.5 rounded-full transition-all ${index === currentImageIndex
                                        ? "w-1.5 bg-white"
                                        : "w-1.5 bg-white/60"
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
                </div>

                {/* Property Info */}
                <div className="mt-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-[15px] text-gray-900 line-clamp-1">
                            {location}
                        </h3>
                        {rating && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="h-3 w-3 fill-current text-gray-900" />
                                <span className="text-sm text-gray-900">{rating.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-1 mb-1">{name}</p>

                    <div className="flex items-baseline gap-1">
                        <span className="font-semibold text-[15px] text-gray-900">
                            {new Intl.NumberFormat("fr-FR", {
                                style: "currency",
                                currency: "XAF",
                                maximumFractionDigits: 0,
                            }).format(price)}
                        </span>
                        <span className="text-sm text-gray-600">/ month</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default PropertyCard;
