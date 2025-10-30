import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, Edit, Trash2, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/Navbar";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images?: { image_url: string }[];
}

const MyProducts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    condition: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    fetchProducts();
  }, [token, navigate]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/products/seller");
      setProducts(response.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg"] },
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    files.forEach(file => {
      data.append("images[]", file);
    });

    try {
      if (isEditing !== null) {
        await apiClient.put(`/products/${isEditing}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast({ title: t("success"), description: t("product updated successfully") });
      } else {
        await apiClient.post("/products", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast({ title: t("success"), description: t("product created successfully") });
      }
      
      await fetchProducts();
      resetForm();
      navigate("/shop");
    } catch (error) {
      console.error("Failed to save product:", error);
      toast({
        title: t("error"),
        description: t("failed to save product"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      condition: "",
    });
    setFiles([]);
    setPreviews([]);
    setIsEditing(null);
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setIsEditing(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      condition: product.condition,
    });
    // Note: Existing images are not editable in this form for simplicity
    setFiles([]);
    setPreviews(product.images?.map(img => img.image_url) || []);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/products/${id}`);
      toast({ title: t("success"), description: t("product deleted successfully") });
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast({
        title: t("error"),
        description: t("failed to delete product"),
        variant: "destructive",
      });
    }
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t("my products")}</h1>
          {!showForm && (
            <Button onClick={() => { setShowForm(true); setIsEditing(null); }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              {t("add product")}
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{isEditing ? t("edit product") : t("add new product")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("product name")} *</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">{t("price")} *</Label>
                    <Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t("description")} *</Label>
                  <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} required />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">{t("category")} *</Label>
                    <Select name="category" value={formData.category} onValueChange={(value) => handleSelectChange("category", value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select a category")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Electronics">{t("Electronics")}</SelectItem>
                        <SelectItem value="Fashion">{t("Fashion")}</SelectItem>
                        <SelectItem value="Home & Garden">{t("Home & Garden")}</SelectItem>
                        <SelectItem value="Sports & Outdoors">{t("Sports & Outdoors")}</SelectItem>
                        <SelectItem value="Toys & Hobbies">{t("Toys & Hobbies")}</SelectItem>
                        <SelectItem value="Health & Beauty">{t("Health & Beauty")}</SelectItem>
                        <SelectItem value="Automotive">{t("Automotive")}</SelectItem>
                        <SelectItem value="Other">{t("Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">{t("condition")} *</Label>
                    <Select name="condition" value={formData.condition} onValueChange={(value) => handleSelectChange("condition", value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select a condition")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">{t("New")}</SelectItem>
                        <SelectItem value="Used - Like New">{t("Used - Like New")}</SelectItem>
                        <SelectItem value="Used - Good">{t("Used - Good")}</SelectItem>
                        <SelectItem value="Used - Fair">{t("Used - Fair")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("product images")}</Label>
                  <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer">
                    <input {...getInputProps()} />
                    <p>{t("drag 'n' drop some files here, or click to select files")}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt={`preview ${index}`} className="h-24 w-24 object-cover rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-0 right-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? t("update product") : t("create product")}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <Card key={product.id} className="overflow-hidden">
              <img
                src={product.images?.[0]?.image_url || "/placeholder.svg"}
                alt={product.name}
                className="h-48 w-full object-cover"
              />
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-muted-foreground text-sm">{product.category}</p>
                <p className="font-bold text-xl mt-2">${product.price}</p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={() => handleEdit(product)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t("edit")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyProducts;