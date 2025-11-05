import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Store, 
  MapPin, 
  Mail, 
  Phone, 
  Upload, 
  Loader2,
  Edit2,
  Package,
  TrendingUp
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { toast } from "@/hooks/use-toast";

interface Shop {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  status: "active";
  images?: { image_url: string }[];
  shop_id: number;
}

const ShopPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    description: "",
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");

  const token = localStorage.getItem("token");

  const fetchShop = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/shops");
      const shopData = response.data.shop || response.data;
      setShop(shopData);
      
      setFormData({
        name: shopData.name || "",
        email: shopData.email || "",
        phone: shopData.phone || "",
        location: shopData.location || "",
        description: shopData.description || "",
      });
      
      if (shopData.logo_url) setLogoPreview(shopData.logo_url);
      if (shopData.banner_url) setBannerPreview(shopData.banner_url);
      
      setIsEditing(false);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        setIsEditing(true);
      }
      console.error("Failed to fetch shop:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!shop) return;
    try {
      const response = await apiClient.get(`/products/seller`);
      const filteredProducts = response.data.filter(
        (product: Product) => product.shop_id === shop.id
      );
      setProducts(filteredProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  }, [shop]);

  useEffect(() => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    fetchShop();
  }, [token, navigate, fetchShop]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onLogoDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const onBannerDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps } = useDropzone({
    onDrop: onLogoDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg"] },
    multiple: false,
  });

  const { getRootProps: getBannerRootProps, getInputProps: getBannerInputProps } = useDropzone({
    onDrop: onBannerDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg"] },
    multiple: false,
  });

  const handleSave = async () => {
    setIsSaving(true);
    
    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    data.append("phone", formData.phone);
    data.append("location", formData.location);
    data.append("description", formData.description);
    
    if (logoFile) data.append("logo", logoFile);
    if (bannerFile) data.append("banner", bannerFile);

    try {
      await apiClient.post("/shops", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      toast({
        title: t("success"),
        description: t("shop saved successfully"),
      });
      
      await fetchShop();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save shop:", error);
      toast({
        title: t("error"),
        description: t("failed to save shop"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith("http")) return imagePath;
    return `http://localhost:8082${imagePath}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {isEditing && !shop ? t("create your shop") : t("my shop")}
            </h1>
            <p className="text-muted-foreground">
              {isEditing && !shop 
                ? t("set up your shop to start selling") 
                : t("manage your shop and products")}
            </p>
          </div>
          {shop && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              {t("edit shop")}
            </Button>
          )}
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>{shop ? t("edit shop information") : t("shop information")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Banner Image */}
              <div className="space-y-2">
                <Label>{t("shop banner")}</Label>
                <div
                  {...getBannerRootProps()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <input {...getBannerInputProps()} />
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" className="max-h-40 mx-auto rounded" />
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="h-12 w-12 mx-auto mb-2" />
                      <p>{t("click to upload banner")}</p>
                      <p className="text-sm">{t("recommended size 1200x300")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Image */}
              <div className="space-y-2">
                <Label>{t("shop logo")}</Label>
                <div
                  {...getLogoRootProps()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <input {...getLogoInputProps()} />
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-24 w-24 mx-auto rounded-full" />
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="h-12 w-12 mx-auto mb-2" />
                      <p>{t("click to upload logo")}</p>
                      <p className="text-sm">{t("recommended size 200x200")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Shop Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("shop name")} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("enter shop name")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">{t("location")} *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t("e.g., Douala, Akwa")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("contact email")} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="shop@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("contact phone")} *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+2376XXXXXXXX"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("include country code for whatsapp")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("shop description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("tell customers about your shop")}
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("save shop")}
                </Button>
                {shop && (
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    {t("cancel")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : shop ? (
          <>
            {/* Shop Profile Display */}
            <Card className="mb-8">
              <CardContent className="p-0">
                {/* Banner */}
                {bannerPreview && (
                  <div className="h-48 md:h-64 overflow-hidden rounded-t-lg">
                    <img 
                      src={bannerPreview} 
                      alt="Shop banner" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Logo */}
                    {logoPreview && (
                      <img 
                        src={logoPreview} 
                        alt="Shop logo" 
                        className="h-24 w-24 rounded-full border-4 border-background -mt-16 md:-mt-20"
                      />
                    )}
                    
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">{shop.name}</h2>
                      {shop.description && (
                        <p className="text-muted-foreground mb-4">{shop.description}</p>
                      )}
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-semibold">
                            {shop.location || t("location not set")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{shop.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{shop.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shop Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("total products")}</p>
                      <p className="text-2xl font-bold">{shop.product_count || products.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("active listings")}</p>
                      <p className="text-2xl font-bold">
                        {products.filter(p => p.status === "active").length}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("member since")}</p>
                      <p className="text-lg font-bold">
                        {new Date(shop.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Store className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Products Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("shop products")}</CardTitle>
                <Button onClick={() => navigate("/my-products")}>
                  {t("manage products")}
                </Button>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t("no products yet")}
                    </p>
                    <Button onClick={() => navigate("/my-products")}>
                      {t("add your first product")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {products.slice(0, 10).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={{
                          ...product,
                          id: product.id.toString(),
                          contact_phone: null,
                          contact_email: null,
                          images: product.images || [],
                        }}
                        token={token}
                        getImageUrl={getImageUrl}
                        variant="seller"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ShopPage;
