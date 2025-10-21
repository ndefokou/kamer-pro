import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, ShoppingCart, Heart, Edit2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location: string;
  contact_phone: string | null;
  contact_email: string | null;
  images: { image_url: string }[];
  created_at?: string;
  status?: "active" | "inactive";
  condition?: string;
}

interface ProductCardProps {
  product: Product;
  token: string | null;
  isInWishlist?: (productId: number) => boolean;
  handleToggleWishlist?: (productId: string) => void;
  handleAddToCart?: (productId: string) => void;
  getImageUrl: (imagePath: string) => string;
  variant?: "marketplace" | "seller";
  onEdit?: () => void;
  onDelete?: () => void;
}

const ProductCard = ({
  product,
  token,
  isInWishlist,
  handleToggleWishlist,
  handleAddToCart,
  getImageUrl,
  variant = "marketplace",
  onEdit,
  onDelete,
}: ProductCardProps) => {
  const { t } = useTranslation();

  return (
    <Card
      key={product.id}
      className="shadow-soft hover:shadow-elevated transition-shadow flex flex-col h-full"
    >
      <Link to={`/product/${product.id}`}>
        {product.images && product.images.length > 0 && (
          <div className="h-32 sm:h-40 md:h-48 overflow-hidden rounded-t-lg relative flex-shrink-0">
            <img
              src={getImageUrl(product.images[0].image_url)}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {variant === "marketplace" && token && handleToggleWishlist && isInWishlist && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-1 right-1 sm:top-2 sm:right-2 h-6 w-6 sm:h-8 sm:w-8"
                onClick={(e) => {
                  e.preventDefault();
                  handleToggleWishlist(product.id);
                }}
              >
                <Heart
                  className={`h-3 w-3 sm:h-4 sm:w-4 ${
                    isInWishlist(parseInt(product.id))
                      ? "fill-current text-red-500"
                      : ""
                  }`}
                />
              </Button>
            )}
            {variant === "seller" && product.status && (
              <Badge
                variant={product.status === "active" ? "default" : "secondary"}
                className="absolute top-2 right-2"
              >
                {t(product.status)}
              </Badge>
            )}
          </div>
        )}
      </Link>
      <CardHeader className="p-2 sm:p-3 flex-grow-0">
        <div className="flex justify-between items-start gap-1 sm:gap-2">
          <Link to={`/product/${product.id}`} className="flex-1 min-w-0">
            <CardTitle className="text-xs sm:text-sm md:text-base hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </CardTitle>
          </Link>
          {product.category && (
            <Badge
              variant="secondary"
              className="text-[10px] sm:text-xs flex-shrink-0 px-1 py-0 sm:px-2"
            >
              {t(
                `categories.${product.category
                  .toLowerCase()
                  .replace(" & ", "_")}`
              )}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2 text-[10px] sm:text-xs mt-1 hidden sm:block">
          {product.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 pt-0 flex-grow-0">
        <div className="space-y-0.5 sm:space-y-1">
          <div className="text-sm sm:text-base md:text-lg font-bold text-primary">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "XAF",
            }).format(product.price)}
          </div>
          <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground">
            <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 flex-shrink-0" />
            <span className="truncate">{product.location}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-1 sm:space-y-2 p-2 sm:p-3 pt-0 mt-auto">
        {variant === "marketplace" && token && handleAddToCart && (
          <Button
            className="w-full text-[10px] sm:text-xs h-7 sm:h-8"
            onClick={() => handleAddToCart(product.id)}
          >
            <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
            <span className="hidden sm:inline">{t("add to cart")}</span>
            <span className="sm:hidden">{t("cart")}</span>
          </Button>
        )}
        {variant === "seller" && (
          <div className="flex justify-end space-x-2 w-full">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              {t("edit")}
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              {t("delete")}
            </Button>
          </div>
        )}
        {variant === "marketplace" && (
          <div className="hidden sm:block w-full space-y-1">
            {product.contact_phone && (
              <div className="flex items-center text-xs w-full min-w-0">
                <Phone className="h-3 w-3 mr-1 text-primary flex-shrink-0" />
                <a
                  href={`tel:${product.contact_phone}`}
                  className="hover:underline truncate"
                >
                  {product.contact_phone}
                </a>
              </div>
            )}
            {product.contact_email && (
              <div className="flex items-center text-xs w-full min-w-0">
                <Mail className="h-3 w-3 mr-1 text-primary flex-shrink-0" />
                <a
                  href={`mailto:${product.contact_email}`}
                  className="hover:underline truncate"
                >
                  {product.contact_email}
                </a>
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard;