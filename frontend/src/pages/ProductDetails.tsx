import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import apiClient from "@/api/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin } from "lucide-react";

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
  images: string[];
}

const ProductDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/products/${id}`);
        setProduct(response.data);
      } catch (error) {
        console.error("Failed to fetch product:", error);
      }
      setIsLoading(false);
    };

    fetchProduct();
  }, [id]);

  if (isLoading) {
    return <div>{t("loading")}</div>;
  }

  if (!product) {
    return <div>{t("product_not_found")}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{product.name}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {t(`categories.${product.category.toLowerCase().replace(' & ', '_')}`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div>
              <Carousel className="mb-6">
                <CarouselContent>
                  {product.images.map((image) => (
                    <CarouselItem key={image}>
                      <img
                        src={`http://localhost:3001${image}`}
                        alt={product.name}
                        className="w-full h-auto object-cover rounded-lg border"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("description")}</h3>
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
                  <h3 className="text-lg font-semibold mb-2">{t("condition")}</h3>
                  {product.condition && <Badge variant="outline">{t(`conditions.${product.condition.toLowerCase().replace('-', '_')}`)}</Badge>}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t("location")}</h3>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {product.location}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("contact_seller")}</h3>
                <div className="space-y-2">
                  {product.contact_phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-primary" />
                      <a href={`tel:${product.contact_phone}`} className="hover:underline">{product.contact_phone}</a>
                    </div>
                  )}
                  {product.contact_email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-primary" />
                      <a href={`mailto:${product.contact_email}`} className="hover:underline">{product.contact_email}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductDetails;