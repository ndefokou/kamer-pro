import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Heart,
  ChevronLeft,
} from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useMessaging } from "@/hooks/useMessaging";
import { ProductReviews } from "@/components/ProductReviews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductCard from "@/components/ProductCard";
import { getImageUrl } from "@/lib/utils";

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
  user_id: number;
}

const ProductDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { addToWishlist, isInWishlist, removeFromWishlistByProduct } = useWishlist();
  const token = localStorage.getItem("token");
  const { createOrGetConversation } = useMessaging();

  const handleContactSeller = async () => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    if (product) {
      try {
        const conversationId = await createOrGetConversation(
          parseInt(product.id),
          product.user_id,
        );
        navigate(`/messages`);
      } catch (error) {
        console.error("Failed to start conversation", error);
      }
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/products/${id}`);
        setProduct(response.data);
        if (response.data.images && response.data.images.length > 0) {
          setSelectedImage(response.data.images[0].image_url);
        }

        if (response.data.category) {
          const similarResponse = await apiClient.get("/products", {
            params: { category: response.data.category },
          });
          const filtered = similarResponse.data
            .filter((p: Product) => p.id !== id)
            .slice(0, 6);
          setSimilarProducts(filtered);
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
      }
      setIsLoading(false);
    };

    fetchProduct();
  }, [id]);

  const handleToggleWishlist = () => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    if (product) {
      const productIdNum = parseInt(product.id);
      if (isInWishlist(productIdNum)) {
        removeFromWishlistByProduct(productIdNum);
      } else {
        addToWishlist(productIdNum);
      }
    }
  };

  const handleSimilarToggleWishlist = (productId: string) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>{t("product not found")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-4 md:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("back")}
        </Button>

        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
              {product.name}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base md:text-lg text-muted-foreground">
              {t(`categories.${product.category.toLowerCase().replace(" & ", "_")}`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 md:gap-8 px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Image Section */}
            <div>
              <div className="mb-3 md:mb-4">
                <img
                  src={getImageUrl(selectedImage || "")}
                  alt={product.name}
                  className="w-full h-64 sm:h-80 md:max-h-96 object-contain rounded-lg border bg-muted"
                />
              </div>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {product.images.map((image) => (
                  <img
                    key={image.image_url}
                    src={getImageUrl(image.image_url)}
                    alt="product thumbnail"
                    className={`h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 object-cover rounded-md cursor-pointer border-2 ${
                      selectedImage === image.image_url
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                    onClick={() => setSelectedImage(image.image_url)}
                  />
                ))}
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">
                  {t("description")}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {product.description}
                </p>
              </div>
              
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                }).format(product.price)}
              </div>
              
              <div className="flex items-center text-sm sm:text-base text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                {product.location}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">
                    {t("condition")}
                  </h3>
                  {product.condition && (
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {t(`conditions.${product.condition.toLowerCase().replace("-", "_")}`)}
                    </Badge>
                  )}
                </div>
              </div>

              {token && (
                <div className="space-y-3 md:space-y-4 border-t pt-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={() => {
                        if (product && product.contact_phone) {
                          let cleanedPhone = product.contact_phone.replace(/[-\s()]/g, "");
                          if (!cleanedPhone.startsWith("+")) {
                            cleanedPhone = `+237${cleanedPhone}`;
                          }
                          const message = `Hello, I'm interested in your product "${product.name}" listed for ${product.price}.`;
                          const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, "_blank");
                        }
                      }}
                      disabled={!product.contact_phone}
                    >
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="text-sm sm:text-base">{t("contact on whatsapp")}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleToggleWishlist}
                      className="sm:w-auto"
                    >
                      <Heart
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${isInWishlist(parseInt(product.id)) ? "fill-current text-red-500" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">
                  {t("contact seller")}
                </h3>
                <div className="space-y-2">
                  {product.contact_phone && (
                    <div className="flex items-center text-sm sm:text-base">
                      <Phone className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                      <a
                        href={`tel:${product.contact_phone}`}
                        className="hover:underline break-all"
                      >
                        {product.contact_phone}
                      </a>
                    </div>
                  )}
                  {product.contact_email && (
                    <div className="flex items-center text-sm sm:text-base">
                      <Mail className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                      <a
                        href={`mailto:${product.contact_email}`}
                        className="hover:underline break-all"
                      >
                        {product.contact_email}
                      </a>
                    </div>
                  )}
                </div>
                {token && (
                  <Button onClick={handleContactSeller} className="mt-2 w-full sm:w-auto" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    {t("contact seller via chat")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Details Tabs */}
        <Card className="mt-6 md:mt-8">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-sm sm:text-base"
              >
                {t("description")}
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-sm sm:text-base"
              >
                {t("reviews")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="p-4 sm:p-6">
              <div className="prose max-w-none">
                <h3 className="text-lg sm:text-xl font-semibold mb-4">
                  {t("product description")}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap">
                  {product.description}
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold mb-2">{t("condition")}</h4>
                    {product.condition && (
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {t(`conditions.${product.condition.toLowerCase().replace("-", "_")}`)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="p-4 sm:p-6">
              <ProductReviews
                productId={parseInt(product.id)}
                isProductOwner={
                  product.user_id ===
                  parseInt(localStorage.getItem("userId") || "0")
                }
              />
            </TabsContent>
          </Tabs>
        </Card>

        {similarProducts.length > 0 && (
          <div className="mt-8 md:mt-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 md:mb-6">{t("similar products")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
              {similarProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  token={token}
                  isInWishlist={isInWishlist}
                  handleToggleWishlist={handleSimilarToggleWishlist}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
