import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Trash2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Wishlist = () => {
  const { t } = useTranslation();
  const { wishlistItems, removeFromWishlist, isLoading } = useWishlist();
  const { addToCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
    }).format(price);
  };

  const handleAddToCart = async (productId: number, wishlistId: number) => {
    await addToCart(productId, 1);
    await removeFromWishlist(wishlistId);
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <Heart className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t("your_wishlist_is_empty")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("save_items_you_love_to_your_wishlist")}
              </p>
              <Link to="/marketplace">
                <Button>{t("browse_products")}</Button>
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
          <h1 className="text-4xl font-bold mb-2">{t("my_wishlist")}</h1>
          <p className="text-muted-foreground">
            {wishlistItems.length} {wishlistItems.length === 1 ? t("item") : t("items")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="shadow-soft hover:shadow-elevated transition-shadow">
              <Link to={`/product/${item.product_id}`}>
                {item.product_image && (
                  <div className="h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                )}
              </Link>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Link to={`/product/${item.product_id}`}>
                    <CardTitle className="text-xl hover:text-primary transition-colors">
                      {item.product_name}
                    </CardTitle>
                  </Link>
                  {item.product_category && (
                    <Badge variant="secondary">
                      {t(`categories.${item.product_category.toLowerCase().replace(' & ', '_')}`)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(item.product_price)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {item.product_location}
                  </div>
                  {item.product_status !== 'active' && (
                    <Badge variant="destructive">{t("not_available")}</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleAddToCart(item.product_id, item.id)}
                  disabled={isLoading || item.product_status !== 'active'}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {t("add_to_cart")}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeFromWishlist(item.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
