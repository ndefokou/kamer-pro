import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useMessaging } from "@/hooks/useMessaging";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Package } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getProducts } from "@/api/client";
import { useWishlist } from "@/hooks/useWishlist";
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
  created_at: string;
  user_id: number;
}

const CATEGORIES = [
  { key: "all", value: "All" },
  { key: "apartment", value: "apartment" },
  { key: "studio", value: "studio" },
  { key: "bedroom", value: "bedroom" },
  { key: "villa", value: "villa" },
  { key: "office", value: "office" },
  { key: "company", value: "company" },
  { key: "other", value: "Other" },
];

const CONDITIONS = [
  { key: "All", value: "All" },
  { key: "for_sale", value: "For sale" },
  { key: "for_rent", value: "For rent" },
];

const LOCATIONS = [
  { key: "all", value: "All" },
  { key: "douala", value: "Douala" },
  { key: "yaounde", value: "Yaoundé" },
  { key: "garoua", value: "Garoua" },
  { key: "bamenda", value: "Bamenda" },
  { key: "maroua", value: "Maroua" },
  { key: "bafoussam", value: "Bafoussam" },
  { key: "ngaoundere", value: "Ngaoundéré" },
  { key: "bertoua", value: "Bertoua" },
  { key: "ebolowa", value: "Ebolowa" },
  { key: "kumba", value: "Kumba" },
  { key: "limbe", value: "Limbe" },
  { key: "buea", value: "Buea" },
];

const Marketplace = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToWishlist, isInWishlist, removeFromWishlistByProduct } =
    useWishlist();
  const { createConversation } = useMessaging();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem("token");

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        search: searchQuery,
        category: selectedCategory,
        location: selectedLocation,
        condition: selectedCondition,
        min_price: minPrice,
        max_price: maxPrice,
      };
      const data = await getProducts(filters);
      setFilteredProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
    setIsLoading(false);
  }, [
    searchQuery,
    selectedCategory,
    selectedLocation,
    selectedCondition,
    minPrice,
    maxPrice,
  ]);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [fetchProducts]);


  const handleToggleWishlist = (productId: string) => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    const productIdNum = parseInt(productId);
    if (isInWishlist(productIdNum)) {
      removeFromWishlistByProduct(productIdNum);
    } else {
      addToWishlist(productIdNum);
    }
  };

  const handleContactSeller = async (product: Product) => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    const conversationId = await createConversation(
      product.user_id,
      parseInt(product.id),
    );
    if (conversationId) {
      navigate(`/messages?conversationId=${conversationId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t("marketplace")}</h1>
          <p className="text-muted-foreground">{t("discover products")}</p>
        </div>

        <div className="mb-8 p-4 border rounded-lg space-y-4">
          <div>
            <Label className="mb-2 block">{t("category")}</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.key}
                  variant={
                    selectedCategory === category.value ? "default" : "outline"
                  }
                  onClick={() => setSelectedCategory(category.value)}
                  className="text-xs px-3 py-1 h-auto"
                >
                  {t(`categories.${category.key}`)}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label htmlFor="location">{t("location")}</Label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger id="location" className="w-full">
                  <SelectValue placeholder={t("location")} />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((location) => (
                    <SelectItem key={location.key} value={location.value}>
                      {t(`locations.${location.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="condition">{t("condition")}</Label>
              <Select
                value={selectedCondition}
                onValueChange={setSelectedCondition}
              >
                <SelectTrigger id="condition" className="w-full">
                  <SelectValue placeholder={t("condition")} />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((condition) => (
                    <SelectItem key={condition.key} value={condition.value}>
                      {t(`conditions.${condition.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="min-price">{t("min price")}</Label>
              <Input
                id="min-price"
                placeholder={t("min price")}
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-price">{t("max price")}</Label>
              <Input
                id="max-price"
                placeholder={t("max price")}
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("loading products")}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("no products found")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                token={token}
                isInWishlist={isInWishlist}
                handleToggleWishlist={handleToggleWishlist}
                onContactSeller={handleContactSeller}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
