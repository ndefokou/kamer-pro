import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Upload, Loader2, Phone, Mail } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/Navbar";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  contact_phone?: string;
  contact_email?: string;
  status: "active" | "inactive";
  images?: { image_url: string }[];
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
  "Kribi",
];

const SellerDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    location: "",
    contact_phone: "",
    contact_email: "",
    images: [] as File[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get("/products/seller");
      setProducts(response.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenDialog = (product: Product | null = null) => {
    setEditingProduct(product);
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        condition: product.condition,
        location: product.location,
        contact_phone: product.contact_phone || "",
        contact_email: product.contact_email || "",
        images: [],
      });
      if (product.images && product.images.length > 0) {
        setPreviews(product.images.map(img => {
          const url = img.image_url;
          return url.startsWith('http') ? url : `http://localhost:8082${url}`;
        }));
      } else {
        setPreviews([]);
      }
    } else {
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        condition: "",
        location: "",
        contact_phone: "",
        contact_email: "",
        images: [],
      });
      setPreviews([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      condition: "",
      location: "",
      contact_phone: "",
      contact_email: "",
      images: [],
    });
    setPreviews([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const onDrop = (acceptedFiles: File[]) => {
    setFormData({ ...formData, images: [...formData.images, ...acceptedFiles] });
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    multiple: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const productData = new FormData();
    productData.append("name", formData.name);
    productData.append("description", formData.description);
    productData.append("price", formData.price);
    productData.append("category", formData.category);
    productData.append("condition", formData.condition);
    productData.append("location", formData.location);
    productData.append("contact_phone", formData.contact_phone);
    productData.append("contact_email", formData.contact_email);
    formData.images.forEach(image => {
      productData.append("images[]", image);
    });

    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, productData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await apiClient.post("/products", productData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      fetchProducts();
      handleCloseDialog();
    } catch (error) {
      console.error("Failed to save product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `http://localhost:8082${imagePath}`;
  };

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const inactiveProducts = totalProducts - activeProducts;

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
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("description")} *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{t("price")} (XAF) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
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
                      <SelectValue placeholder={t("select_a_category")} />
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
                      <SelectValue placeholder={t("select_a_condition")} />
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
                      <SelectValue placeholder={t("select_a_location")} />
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
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">{t("contact_email")}</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleChange}
                  />
              </div>
              </div>

              <div className="space-y-2">
                <Label>{t("product_image")}</Label>
                <div
                  {...getRootProps()}
                  className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 dark:border-gray-100/25 cursor-pointer"
                >
                  <input {...getInputProps()} id="image" />
                  {previews.length > 0 ? (
                    <div className="flex space-x-2">
                      {previews.map((src, index) => (
                        <img key={index} src={src} alt="Product preview" className="h-24 w-24 object-contain" />
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

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("total_products")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("active_listings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("inactive_listings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveProducts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{t("my_products")}</h2>
        <div className="flex space-x-2">
          <Button variant={filterStatus === 'all' ? 'default' : 'outline'} onClick={() => setFilterStatus('all')}>{t("all")}</Button>
          <Button variant={filterStatus === 'active' ? 'default' : 'outline'} onClick={() => setFilterStatus('active')}>{t("active")}</Button>
          <Button variant={filterStatus === 'inactive' ? 'default' : 'outline'} onClick={() => setFilterStatus('inactive')}>{t("inactive")}</Button>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products
            .filter(p => filterStatus === 'all' || p.status === filterStatus)
            .map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardHeader>
                <div className="aspect-w-16 aspect-h-9 mb-4 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={getImageUrl(product.images[0].image_url)}
                      alt={product.name}
                      className="object-cover rounded-lg w-full h-full"
                    />
                  ) : (
                    <div className="text-gray-400">No image</div>
                  )}
                </div>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{product.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                     {product.condition && <Badge variant="outline">{product.condition}</Badge>}
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>
                      {product.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground text-sm mb-4">{product.description.substring(0, 100)}...</p>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-lg font-semibold">{product.price} XAF</p>
                  <p className="text-sm text-muted-foreground">{product.location}</p>
                </div>
                <div className="space-y-2">
                  {product.contact_phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{product.contact_phone}</span>
                    </div>
                  )}
                  {product.contact_email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{product.contact_email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 mt-auto pt-4">
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