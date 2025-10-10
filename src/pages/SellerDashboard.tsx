import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Plus, Edit2, Trash2, MapPin, Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

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
  status: string;
  created_at: string;
}

const CATEGORIES = [
  { key: "electronics", value: "Electronics" },
  { key: "fashion", value: "Fashion" },
  { key: "home_garden", value: "Home & Garden" },
  { key: "vehicles", value: "Vehicles" },
  { key: "real_estate", value: "Real Estate" },
  { key: "services", value: "Services" },
  { key: "other", value: "Other" },
];

const CONDITIONS = [
  { key: "new", value: "New" },
  { key: "like_new", value: "Like-new" },
  { key: "good", value: "Good" },
  { key: "fair", value: "Fair" },
];

const LOCATIONS = [
  "Douala",
  "Yaoundé",
  "Garoua",
  "Bamenda",
  "Maroua",
  "Bafoussam",
  "Ngaoundéré",
  "Bertoua",
  "Ebolowa",
  "Kumba",
  "Limbe",
  "Buea",
];

const SellerDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Electronics",
    location: "Douala",
    condition: "New",
    contact_phone: "",
    contact_email: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(files);
      setImagePreviews(files.map(file => URL.createObjectURL(file)));
    }
  };

  useEffect(() => {
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    try {
      const decoded: { id: number } = jwtDecode(token);
      setUserId(decoded.id);
      fetchProducts();
    } catch (error) {
      navigate("/auth");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get("/products/my-products");
      setProducts(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "Electronics",
      location: "Douala",
      condition: "New",
      contact_phone: "",
      contact_email: "",
    });
    setEditingProduct(null);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        location: product.location,
        condition: product.condition || "New",
        contact_phone: product.contact_phone || "",
        contact_email: product.contact_email || "",
      });
      // This will be updated later to fetch all images
      setImagePreviews(product.images ? product.images.map(img => `http://localhost:3001${img}`) : []);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsLoading(true);
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
      };

      let productResponse;
      if (editingProduct) {
        productResponse = await apiClient.put(`/products/${editingProduct.id}`, productData);
      } else {
        productResponse = await apiClient.post("/products", productData);
      }

      const product = productResponse.data;

      if (imageFiles.length > 0) {
        const imageData = new FormData();
        imageFiles.forEach(file => {
          imageData.append('images', file);
        });
        await apiClient.post(`/upload/${product.id}`, imageData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      toast({
        title: "Success!",
        description: `Product ${editingProduct ? 'updated' : 'created'} successfully.`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await apiClient.delete(`/products/${productId}`);
      toast({
        title: "Success!",
        description: "Product deleted successfully.",
      });
      fetchProducts();
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t("seller_dashboard")}</h1>
            <p className="text-muted-foreground">{t("manage_your_product_listings")}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>{t("add_product")}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? t("edit_product") : t("add_new_product")}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct ? t("fill_in_the_details_to_update") : t("fill_in_the_details_to_create")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("product_title")} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("description")} *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">{t("price")} (XAF) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">{t("category")} *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="condition">{t("condition")} *</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData({ ...formData, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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

                  <div className="space-y-2">
                    <Label htmlFor="location">{t("location")} *</Label>
                     <Select
                      value={formData.location}
                      onValueChange={(value) => setFormData({ ...formData, location: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATIONS.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">{t("contact_phone")}</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+237 XXX XXX XXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">{t("contact_email")}</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("product_image")}</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <div
                    className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreviews.length > 0 ? (
                      <div className="flex space-x-2">
                        {imagePreviews.map((preview, index) => (
                          <img key={index} src={preview} alt="Image preview" className="rounded-md h-24 w-24 object-cover" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                        <Upload className="h-12 w-12" />
                        <p>{t("click_to_upload_an_image")}</p>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingProduct ? t("update_product") : t("create_product")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {products.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">{t("you_havent_created_any_products_yet")}</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("create_your_first_product")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="shadow-soft">
                {product.images && product.images.length > 0 && (
                  <div className="h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={`http://localhost:3001${product.images[0]}`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                       {product.condition && <Badge variant="outline">{t(`conditions.${product.condition.toLowerCase().replace('-', '_')}`)}</Badge>}
                      <Badge variant={product.status === "active" ? "default" : "secondary"}>
                        {product.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 pt-2">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-primary">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "XAF",
                      }).format(Number(product.price))}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {product.location}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(product)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    {t("edit")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("delete")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
