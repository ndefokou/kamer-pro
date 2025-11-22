import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Package, Filter, X, Search } from "lucide-react";
import { getProducts } from "@/api/client";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";

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

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location: string;
  condition?: string;
  contact_phone: string | null;
  contact_email: string | null;
  images: { image_url: string }[];
  created_at: string;
  user_id: number;
}

const Marketplace = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategory, selectedLocation, selectedCondition, minPrice, maxPrice]);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (selectedCategory !== "All") count++;
    if (selectedLocation !== "All") count++;
    if (selectedCondition !== "All") count++;
    if (minPrice) count++;
    if (maxPrice) count++;
    if (searchQuery) count++;
    setActiveFiltersCount(count);
  }, [selectedCategory, selectedLocation, selectedCondition, minPrice, maxPrice, searchQuery]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        search: searchQuery,
        category: selectedCategory !== "All" ? selectedCategory : "",
        location: selectedLocation !== "All" ? selectedLocation : "",
        condition: selectedCondition !== "All" ? selectedCondition : "",
        min_price: minPrice,
        max_price: maxPrice,
      };
      
      const data = await getProducts(filters);
      setFilteredProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedLocation, selectedCondition, minPrice, maxPrice]);

  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedLocation("All");
    setSelectedCondition("All");
    setMinPrice("");
    setMaxPrice("");
    setSearchQuery("");
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-base font-semibold">
          {t("search")}
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder={t("search products")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">{t("category")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.key}
              variant={selectedCategory === category.value ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.value)}
              className="text-xs h-auto py-2"
            >
              {t(`categories.${category.key}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-base font-semibold">
          {t("location")}
        </Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger id="location">
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

      {/* Condition */}
      <div className="space-y-2">
        <Label htmlFor="condition" className="text-base font-semibold">
          {t("condition")}
        </Label>
        <Select value={selectedCondition} onValueChange={setSelectedCondition}>
          <SelectTrigger id="condition">
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

      {/* Price Range */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">{t("price range")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="min-price" className="text-xs text-muted-foreground">
              {t("min")}
            </Label>
            <Input
              id="min-price"
              placeholder="0"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="max-price" className="text-xs text-muted-foreground">
              {t("max")}
            </Label>
            <Input
              id="max-price"
              placeholder="1000000"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          onClick={clearFilters}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          {t("clear all filters")} ({activeFiltersCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {t("marketplace")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  t("loading products")
                ) : (
                  <>
                    {filteredProducts.length}{" "}
                    {filteredProducts.length === 1 ? t("product") : t("products")}
                  </>
                )}
              </p>
            </div>

            {/* Mobile Filter Button */}
            <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  {t("filters")}
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="default"
                      className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("filters")}</SheetTitle>
                  <SheetDescription>
                    {t("filter products by your preferences")}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  {t("search")}: {searchQuery}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {selectedCategory !== "All" && (
                <Badge variant="secondary" className="gap-1">
                  {t(`categories.${CATEGORIES.find(c => c.value === selectedCategory)?.key || "all"}`)}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCategory("All")}
                  />
                </Badge>
              )}
              {selectedLocation !== "All" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedLocation}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedLocation("All")}
                  />
                </Badge>
              )}
              {selectedCondition !== "All" && (
                <Badge variant="secondary" className="gap-1">
                  {t(`conditions.${CONDITIONS.find(c => c.value === selectedCondition)?.key || "All"}`)}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCondition("All")}
                  />
                </Badge>
              )}
              {(minPrice || maxPrice) && (
                <Badge variant="secondary" className="gap-1">
                  {minPrice && `${minPrice} XAF`}
                  {minPrice && maxPrice && " - "}
                  {maxPrice && `${maxPrice} XAF`}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-4 gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden md:block md:col-span-1">
            <div className="sticky top-4">
              <Card className="p-4">
                <h2 className="text-lg font-semibold mb-4">{t("filters")}</h2>
                <FilterContent />
              </Card>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("loading products")}</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t("no products found")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("try adjusting your filters")}
                </p>
                {activeFiltersCount > 0 && (
                  <Button onClick={clearFilters} variant="outline">
                    {t("clear all filters")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <Link to={`/product/${product.id}`} key={product.id} className="block h-full">
                  <div
                    className="bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-shadow h-full"
                  >
                    <div className="aspect-square relative bg-muted">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0].image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {product.location}
                      </p>
                      <p className="font-bold text-primary">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "XAF",
                          maximumFractionDigits: 0,
                        }).format(product.price)}
                      </p>
                    </div>
                  </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
