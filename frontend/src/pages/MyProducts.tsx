import { useState, useEffect, useCallback } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  images?: { image_url: string }[];
}

const MyProducts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("showAddForm") === "true";
  });
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    location: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const token = localStorage.getItem("token");

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/products/seller");
      setProducts(response.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast({
        title: t("error"),
        description: t("failed to fetch products"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    fetchProducts();
  }, [token, navigate, fetchProducts]);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get("edit");
    
    if (editId && products.length > 0) {
      const productToEdit = products.find(p => p.id === parseInt(editId));
      if (productToEdit) {
        handleEdit(productToEdit);
      }
    }
  }, [location.search, products]);

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
      navigate("/company");
    } catch (error) {
      console.error("Failed to save product:", error);
      let errorMessage = t("failed to save product");
      if (error instanceof AxiosError && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: t("error"),
        description: errorMessage,
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
      location: "",
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
      location: product.location,
    });
    setFiles([]);
    setPreviews(product.images?.map(img => img.image_url) || []);
    setShowForm(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteProductId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteProductId === null) return;

    try {
      await apiClient.delete(`/products/${deleteProductId}`);
      toast({ title: t("success"), description: t("product deleted successfully") });
      await fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      let errorMessage = t("failed to delete product");
      if (error instanceof AxiosError && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: t("error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteProductId(null);
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {showForm ? (
          <>
            {/* Breadcrumbs and Title */}
            <div className="mb-8">
              <nav className="text-sm text-gray-500 mb-2">
                <ol className="list-none p-0 inline-flex">
                  <li className="flex items-center">
                    <a href="/" className="hover:underline">{t("home")}</a>
                    <svg className="h-5 w-5 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </li>
                  <li className="flex items-center">
                    <span className="text-gray-500 cursor-pointer hover:underline" onClick={resetForm}>{t("my products")}</span>
                    <svg className="h-5 w-5 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </li>
                  <li className="flex items-center">
                    <span className="text-gray-400">{isEditing ? t("editProperty") : t("add new property")}</span>
                  </li>
                </ol>
              </nav>
              <h1 className="text-3xl font-bold text-gray-800">
                {isEditing ? t("editProperty") : t("add new property")}
              </h1>
            </div>

            {/* Main Form Layout */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("propertyDescription")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("property name")} *</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder={t("enter your property nameceholder")} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">{t("description")} *</Label>
                        <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder={t("enter the property description")} required rows={6} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t("propertyDetails")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="category">{t("category")} *</Label>
                        <Select name="category" value={formData.category} onValueChange={(value) => handleSelectChange("category", value)} required>
                          <SelectTrigger><SelectValue placeholder={t("select a category")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apartment">{t("apartment")}</SelectItem>
                            <SelectItem value="studio">{t("studio")}</SelectItem>
                            <SelectItem value="bedroom">{t("bedroom")}</SelectItem>
                            <SelectItem value="villa">{t("villa")}</SelectItem>
                            <SelectItem value="office">{t("office")}</SelectItem>
                            <SelectItem value="company">{t("company")}</SelectItem>
                            <SelectItem value="Other">{t("Other")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="condition">{t("property status")} *</Label>
                        <Select name="condition" value={formData.condition} onValueChange={(value) => handleSelectChange("condition", value)} required>
                          <SelectTrigger><SelectValue placeholder={t("select a condition")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="for_sale">{t("for_sale")}</SelectItem>
                            <SelectItem value="for_rent">{t("for_rent")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">{t("price")} (XAF) *</Label>
                        <Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="250,000" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">{t("location")} *</Label>
                        <Input id="location" name="location" value={formData.location} onChange={handleInputChange} placeholder={t("locationPlaceholder")} required />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Map and Images */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("propertyLocation")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-gray-200 rounded-md flex items-center justify-center">
                        <p className="text-gray-500">{t("mapPlaceholder")}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t("propertyImages")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                        <input {...getInputProps()} />
                        <p className="text-sm text-gray-500">{t("drag and drop")}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-4">
                        {previews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`preview ${index}`} className="h-24 w-24 object-cover rounded" />
                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeFile(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? t("updateProperty") : t("create  property")}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">{t("my products")}</h1>
              <Button onClick={() => { setShowForm(true); setIsEditing(null); }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                {t("add property")}
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(product => (
                <Card key={product.id} className="overflow-hidden">
                  <img
                    src={product.images?.[0]?.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="h-48 w-full object-cover"
                  />
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                    <p className="text-muted-foreground text-sm">{product.category}</p>
                    <p className="font-bold text-xl mt-2">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "XAF",
                      }).format(product.price)}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t("edit")}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(product.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {products.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">{t("no products yet")}</p>
                <Button onClick={() => setShowForm(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t("add your first property")}
                </Button>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteProductId !== null} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("are you sure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("this action cannot be undone. this will permanently delete your product.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyProducts;
