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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Heart,
  Plus,
  Minus,
} from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useMessaging } from "@/hooks/useMessaging";
import { ProductReviews } from "@/components/ProductReviews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductCard from "@/components/ProductCard";

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
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { addToWishlist, isInWishlist, removeFromWishlistByProduct } =
    useWishlist();
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
        // navigate(`/messages?conversationId=${conversationId}`);
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

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith("http")) {
      return imagePath;
    }
    return `http://localhost:8082${imagePath}`;
  };

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

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity > 0) {
      setQuantity(newQuantity);
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
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{product.name}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {t(
                `categories.${product.category.toLowerCase().replace(" & ", "_")}`,
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="mb-4">
                <img
                  src={getImageUrl(selectedImage || "")}
                  alt={product.name}
                  className="w-full max-h-96 object-contain rounded-lg border bg-muted"
                />
              </div>
              <div className="flex space-x-2 overflow-x-auto">
                {product.images.map((image) => (
                  <img
                    key={image.image_url}
                    src={getImageUrl(image.image_url)}
                    alt="product thumbnail"
                    className={`h-20 w-20 object-cover rounded-md cursor-pointer border-2 ${
                      selectedImage === image.image_url
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                    onClick={() => setSelectedImage(image.image_url)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {t("description")}
                </h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
              <div className="text-3xl font-bold text-primary">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                }).format(product.price)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    {t("condition")}
                  </h3>
                  {product.condition && (
                    <Badge variant="outline">
                      {t(
                        `conditions.${product.condition.toLowerCase().replace("-", "_")}`,
                      )}
                    </Badge>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    {t("location")}
                  </h3>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {product.location}
                  </div>
                </div>
              </div>

              {token && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center space-x-4">
                    <Label htmlFor="quantity">{t("quantity")}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value > 0) {
                            setQuantity(value);
                          }
                        }}
                        className="w-20 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={() => {
                        if (product && product.contact_phone) {
                          window.open(
                            `https://wa.me/${product.contact_phone.replace(
                              /\s/g,
                              ""
                            )}`,
                            "_blank"
                          );
                        }
                      }}
                      disabled={!product || !product.contact_phone}
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      {t("contact on whatsapp")}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleToggleWishlist}
                    >
                      <Heart
                        className={`h-5 w-5 ${isInWishlist(parseInt(product.id)) ? "fill-current text-red-500" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {t("contact seller")}
                </h3>
                <div className="space-y-2">
                  {product.contact_phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-primary" />
                      <a
                        href={`tel:${product.contact_phone}`}
                        className="hover:underline"
                      >
                        {product.contact_phone}
                      </a>
                    </div>
                  )}
                  {product.contact_email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-primary" />
                      <a
                        href={`mailto:${product.contact_email}`}
                        className="hover:underline"
                      >
                        {product.contact_email}
                      </a>
                    </div>
                  )}
                </div>
                {token && (
                 <Button onClick={handleContactSeller} className="mt-2">
                   <Mail className="h-4 w-4 mr-2" />
                   {t("contact seller via chat")}
                 </Button>
               )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Details Tabs */}
        <Card className="mt-8">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                {t("description")}
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                {t("reviews")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="p-6">
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4">
                  {t("product description")}
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {product.description}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">{t("condition")}</h4>
                    {product.condition && (
                      <Badge variant="outline">
                        {t(
                          `conditions.${product.condition.toLowerCase().replace("-", "_")}`,
                        )}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{t("location")}</h4>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {product.location}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="p-6">
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
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-6">{t("similar products")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-4">
              {similarProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  token={token}
                  isInWishlist={isInWishlist}
                  handleToggleWishlist={handleSimilarToggleWishlist}
                  getImageUrl={getImageUrl}
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
