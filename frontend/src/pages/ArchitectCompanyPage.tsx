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
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Upload, 
  Loader2,
  Edit2,
  FileText,
  TrendingUp
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/Navbar";
import { toast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/utils";

interface Architectcompany {
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
  project_count?: number;
}

const ArchitectCompanyPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [company, setcompany] = useState<Architectcompany | null>(null);
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

  const fetchcompany = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/architect-company");
      const companyData = response.data.company || response.data;
      setcompany(companyData);
      
      setFormData({
        name: companyData.name || "",
        email: companyData.email || "",
        phone: companyData.phone || "",
        location: companyData.location || "",
        description: companyData.description || "",
      });
      
      if (companyData.logo_url) setLogoPreview(getImageUrl(companyData.logo_url));
      if (companyData.banner_url) setBannerPreview(getImageUrl(companyData.banner_url));
      
      setIsEditing(false);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        setcompany(null);
        setIsEditing(true);
      } else {
        console.error("Failed to fetch architect company:", error);
        toast({
          title: t("error"),
          description: "Failed to fetch architect company details.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    fetchcompany();
  }, [token, navigate, fetchcompany]);

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
      const response = await apiClient.post("/architect-company", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const savedcompany = response.data.company || response.data;
      setcompany(savedcompany);
      
      toast({
        title: t("success"),
        description: "Architect company saved successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save architect company:", error);
      toast({
        title: t("error"),
        description: "Failed to save architect company",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {isEditing && !company ? "Create Your Architect Firm" : "My Architect Firm"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing && !company
                ? "Set up your architect firm to showcase projects"
                : "Manage your firm and house plans"}
            </p>
          </div>
          {company && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Firm
            </Button>
          )}
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>{company ? "Edit Firm Information" : "Firm Information"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Banner Image */}
              <div className="space-y-2">
                <Label>Firm Banner</Label>
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
                      <p>Click to upload banner</p>
                      <p className="text-sm">Recommended size: 1200x300</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Image */}
              <div className="space-y-2">
                <Label>Firm Logo</Label>
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
                      <p>Click to upload logo</p>
                      <p className="text-sm">Recommended size: 200x200</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Firm Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Firm Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter firm name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Douala, Akwa"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="firm@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+2376XXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Firm Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell clients about your architectural firm"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Firm
                </Button>
                {company && (
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : company ? (
          <>
            {/* Firm Profile Display */}
            <Card className="mb-8">
              <CardContent className="p-0">
                {/* Banner */}
                {bannerPreview && (
                  <div className="h-48 md:h-64 overflow-hidden rounded-t-lg">
                    <img
                      src={bannerPreview}
                      alt="Firm banner"
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
                        alt="Firm logo"
                        className="h-24 w-24 rounded-full border-4 border-background -mt-16 md:-mt-20"
                      />
                    )}
                    
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">{company.name}</h2>
                      {company.description && (
                        <p className="text-muted-foreground mb-4">{company.description}</p>
                      )}
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{company.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{company.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{company.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Projects</p>
                      <p className="text-2xl font-bold">{company.project_count || 0}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="text-lg font-bold">
                        {new Date(company.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Plans</p>
                      <p className="text-2xl font-bold">{company.project_count || 0}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Projects Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>House Plans & Projects</CardTitle>
                <Button onClick={() => navigate("/architect-projects")}>
                  Manage Projects
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No projects yet
                  </p>
                  <Button onClick={() => navigate("/architect-projects")}>
                    Add Your First Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ArchitectCompanyPage;