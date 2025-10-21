import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Heart } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Wishlist = () => {
  const { t } = useTranslation();
  const { wishlistItems, removeFromWishlist, isLoading } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = async (productId: number, wishlistId: number) => {
    await addToCart(productId, 1);
    // Optionally remove from wishlist after adding to cart
    // await removeFromWishlist(wishlistId);
  };

  const handleToggleWishlist = (productId: string) => {
    const item = wishlistItems.find((item) => item.id === productId);
    if (item) {
      removeFromWishlist(item.wishlist_id);
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/placeholder-image.png";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://localhost:8082${imagePath}`;
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <Heart className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                Ma liste de souhaits
              </h2>
              <p className="text-muted-foreground mb-6">
                Votre liste de souhaits est vide
              </p>
              <Link to="/marketplace">
                <Button>Découvrir des produits</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Ma liste de souhaits</h1>
          <p className="text-muted-foreground">
            {wishlistItems.length}{" "}
            {wishlistItems.length === 1 ? "article" : "articles"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-4">
          {wishlistItems.map((item) => (
            <ProductCard
              key={item.wishlist_id}
              product={item}
              token={localStorage.getItem("token")}
              isInWishlist={() => true}
              handleToggleWishlist={handleToggleWishlist}
              handleAddToCart={() => handleAddToCart(parseInt(item.id), item.wishlist_id)}
              getImageUrl={getImageUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;

