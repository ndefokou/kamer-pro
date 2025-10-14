import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Search, MapPin, Phone, Mail, Package } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getProducts } from "@/api/client";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location: string;
  contact_phone: string | null;
  contact_email: string | null;
  images: string[];
  created_at: string;
}

const CATEGORIES = [
  { key: "all", value: "All" },
  { key: "electronics", value: "Electronics" },
  { key: "fashion", value: "Fashion" },
  { key: "home_garden", value: "Home & Garden" },
  { key: "vehicles", value: "Vehicles" },
  { key: "real_estate", value: "Real Estate" },
  { key: "services", value: "Services" },
  { key: "other", value: "Other" },
];

const CONDITIONS = [
  { key: "all", value: "All" },
  { key: "new", value: "New" },
  { key: "like_new", value: "Like-new" },
  { key: "good", value: "Good" },
  { key: "fair", value: "Fair" },
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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        search: searchQuery,
        category: selectedCategory,
        location: selectedLocation,
        condition: selectedCondition,
        minPrice,
        maxPrice,
      };
      const data = await getProducts(filters);
      setFilteredProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
    setIsLoading(false);
  }, [searchQuery, selectedCategory, selectedLocation, selectedCondition, minPrice, maxPrice]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 500); // Debounce API calls

    return () => {
      clearTimeout(handler);
    };
  }, [fetchProducts]);

  const getImageUrl = (imagePath: string) => {
    // If the path already has the full URL, use it as is
    if (typeof imagePath === 'string' && imagePath.startsWith('http')) {
      return imagePath;
    }
    // Otherwise, construct the URL
    return `http://localhost:8082${imagePath}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("marketplace")}</h1>
          <p className="text-muted-foreground">{t("discover_products")}</p>
        </div>

        <div className="mb-8 p-4 border rounded-lg space-y-4">
          <Input
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <Label htmlFor="category">{t("category")}</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder={t("category")} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.key} value={category.value}>
                      {t(`categories.${category.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="location">{t("location")}</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
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
              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
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
              <Label htmlFor="min-price">{t("min_price")}</Label>
              <Input
                id="min-price"
                placeholder={t("min_price")}
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-price">{t("max_price")}</Label>
              <Input
                id="max-price"
                placeholder={t("max_price")}
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
            <p className="text-muted-foreground">{t("loading_products")}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("no_products_found")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="shadow-soft hover:shadow-elevated transition-shadow">
                <Link to={`/product/${product.id}`}>
                  {product.images && product.images.length > 0 && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={getImageUrl(product.images[0])}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </Link>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Link to={`/product/${product.id}`}>
                      <CardTitle className="text-xl hover:text-primary transition-colors">
                        {product.name}
                      </CardTitle>
                    </Link>
                    {product.category && <Badge variant="secondary">{t(`categories.${product.category.toLowerCase().replace(' & ', '_')}`)}</Badge>}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-primary">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XAF',
                      }).format(product.price)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {product.location}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start space-y-2">
                  {product.contact_phone && (
                    <div className="flex items-center text-sm w-full">
                      <Phone className="h-4 w-4 mr-2 text-primary" />
                      <a href={`tel:${product.contact_phone}`} className="hover:underline">
                        {product.contact_phone}
                      </a>
                    </div>
                  )}
                  {product.contact_email && (
                    <div className="flex items-center text-sm w-full">
                      <Mail className="h-4 w-4 mr-2 text-primary" />
                      <a href={`mailto:${product.contact_email}`} className="hover:underline">
                        {product.contact_email}
                      </a>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
      </div>
        )}
    </div>
    </div >
  );
};

export default Marketplace;
