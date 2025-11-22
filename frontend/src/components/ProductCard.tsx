import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Heart,
  Edit2,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getImageUrl } from "@/lib/utils";

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
  status?: "active";
  condition?: string;
}

interface ProductCardProps {
  product: Product;
  token: string | null;
  isInWishlist?: (productId: number) => boolean;
  handleToggleWishlist?: (productId: string) => void;
  variant?: "marketplace" | "seller" | "wishlist";
  onEdit?: () => void;
  onDelete?: () => void;
  onContactSeller?: (product: Product) => void;
}

const ProductCard = ({
  product,
  token,
  isInWishlist,
  handleToggleWishlist,
  variant = "marketplace",
  onEdit,
  onDelete,
  onContactSeller,
}: ProductCardProps) => {
  const { t } = useTranslation();

  return (
    <Card
      key={product.id}
      className="shadow-soft hover:shadow-elevated transition-shadow flex flex-col h-full"
    >
      <Link to={`/product/${product.id}`}>
        {product.images && product.images.length > 0 && (
          <div className="h-28 sm:h-40 md:h-48 overflow-hidden rounded-t-lg relative flex-shrink-0">
            <img
              src={getImageUrl(product.images[0].image_url)}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {variant === "marketplace" &&
              token &&
              handleToggleWishlist &&
              isInWishlist && (
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
            <CardTitle className="text-xs sm:text-sm hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </CardTitle>
          </Link>
        </div>
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{product.location}</span>
        </div>
        <CardDescription className="line-clamp-2 text-xs mt-1">
          {product.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 pt-0 flex-grow">
        <div className="space-y-1">
          <div className="text-sm font-bold text-primary">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "XAF",
            }).format(product.price)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-2 sm:p-3 pt-0 mt-auto">
        {variant === "seller" && (
          <div className="flex justify-end space-x-2 w-full">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:w-auto sm:px-3"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-1">{t("edit")}</span>
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 sm:w-auto sm:px-3"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-1">{t("delete")}</span>
            </Button>
          </div>
        )}
        {variant === "wishlist" && (
          <Button
            className="w-full"
            onClick={() => {
              if (product && product.contact_phone) {
                // Clean the phone number: remove spaces, dashes, parentheses
                let cleanedPhone = product.contact_phone.replace(
                  /[-\s()]/g,
                  ""
                );

                // Ensure it has a country code (default to +237 for Cameroon if missing)
                if (!cleanedPhone.startsWith("+")) {
                  cleanedPhone = `+237${cleanedPhone}`;
                }

                const message = `Hello, I'm interested in your product "${product.name}" listed for ${product.price}.`;
                const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(
                  message
                )}`;
                window.open(whatsappUrl, "_blank");
              }
            }}
            disabled={!product.contact_phone}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {t("contact on whatsapp")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
