import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import ShopSettings from "@/components/ShopSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  status: "active";
  images?: { image_url: string }[];
}

const CATEGORIES = [
  { key: "electronics", value: "Electronics" },
  { key: "fashion", value: "Fashion" },
  { key: "home garden", value: "Home & Garden" },
  { key: "vehicles", value: "Vehicles" },
  { key: "real estate", value: "Real Estate" },
  { key: "services", value: "Services" },
  { key: "other", value: "Other" },
];

const CONDITIONS = [
  { key: "new", value: "New" },
  { key: "like new", value: "Like-new" },
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
  const [shopData, setShopData] = useState({
    email: "",
    phone: "",
    location: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active"
  >("all");
  const [activeTab, setActiveTab] = useState("products");

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get("/products/seller");
      setProducts(response.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchShopData = async () => {
    try {
      const response = await apiClient.get("/shop");
      setShopData(response.data);
    } catch (error) {
      console.error("Failed to fetch shop data:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchShopData();
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
        setPreviews(
          product.images.map((img) => {
            const url = img.image_url;
            return url.startsWith("http") ? url : `http://localhost:8082${url}`;
          }),
        );
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
        location: shopData.location,
        contact_phone: shopData.phone,
        contact_email: shopData.email,
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const onDrop = (acceptedFiles: File[]) => {
    setFormData({
      ...formData,
      images: [...formData.images, ...acceptedFiles],
    });
    const newPreviews = acceptedFiles.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg"] },
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
    formData.images.forEach((image) => {
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
    if (imagePath.startsWith("http")) {
      return imagePath;
    }
    return `http://localhost:8082${imagePath}`;
  };

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === "active").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t("seller dashboard")}</h1>
            <p className="text-muted-foreground">
              {t("manage your product listings")}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">{t("my products")}</TabsTrigger>
            <TabsTrigger value="shop">{t("my shop")}</TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <div className="flex justify-end mt-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => handleOpenDialog()}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t("add product")}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct
                        ? t("edit product")
                        : t("add new product")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingProduct
                        ? t("fill in the details to update")
                        : t("fill in the details to create")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("product title")} *</Label>
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
                          onValueChange={(value) =>
                            setFormData({ ...formData, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("select a category")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem
                                key={category.key}
                                value={category.value}
                              >
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
                          onValueChange={(value) =>
                            setFormData({ ...formData, condition: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("select a condition")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITIONS.map((condition) => (
                              <SelectItem
                                key={condition.key}
                                value={condition.value}
                              >
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
                          onValueChange={(value) =>
                            setFormData({ ...formData, location: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("select a location")}
                            />
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
                        <Label htmlFor="contact_phone">
                          {t("contact phone")}
                        </Label>
                        <Input
                          id="contact_phone"
                          type="tel"
                          value={formData.contact_phone}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact_email">
                          {t("contact email")}
                        </Label>
                        <Input
                          id="contact_email"
                          type="email"
                          value={formData.contact_email}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("product image")}</Label>
                      <div
                        {...getRootProps()}
                        className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 dark:border-gray-100/25 cursor-pointer"
                      >
                        <input {...getInputProps()} id="image" />
                        {previews.length > 0 ? (
                          <div className="flex space-x-2">
                            {previews.map((src, index) => (
                              <img
                                key={index}
                                src={src}
                                alt="Product preview"
                                className="h-24 w-24 object-contain"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                            <Upload className="h-12 w-12" />
                            <p>{t("click to upload an image")}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editingProduct
                          ? t("update product")
                          : t("create product")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-4 md:grid-cols-3 my-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("total products")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("active listings")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeProducts}</div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{t("my products")}</h2>
              <div className="flex space-x-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                >
                  {t("all")}
                </Button>
                <Button
                  variant={filterStatus === "active" ? "default" : "outline"}
                  onClick={() => setFilterStatus("active")}
                >
                  {t("active")}
                </Button>
              </div>
            </div>
            {products.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {t("you havent created any products yet")}
                  </p>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("create your first product")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4">
                {products
                  .filter(
                    (p) =>
                      filterStatus === "all" || p.status === filterStatus,
                  )
                  .map((product) => (
                    <ProductCard
                      key={product.id}
                      product={{
                        ...product,
                        id: product.id.toString(),
                        contact_phone: product.contact_phone ?? null,
                        contact_email: product.contact_email ?? null,
                        images: product.images ?? [],
                      }}
                      token={localStorage.getItem("token")}
                      getImageUrl={getImageUrl}
                      variant="seller"
                      onEdit={() => handleOpenDialog(product)}
                      onDelete={() => handleDelete(product.id)}
                    />
                  ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="shop">
            <ShopSettings
              shopData={shopData}
              onShopDataChange={setShopData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SellerDashboard;
