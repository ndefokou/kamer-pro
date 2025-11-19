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
  PlusCircle, 
  Loader2, 
  Edit2, 
  Trash2, 
  X,
  Upload,
  FileText
} from "lucide-react";
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

interface ArchitectProject {
  id: number;
  name: string;
  description: string;
  project_cost: number;
  house_plan_url?: string;
  location: string;
  maquettes: string[];
  images: string[];
  created_at: string;
}

const ArchitectProjectsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ArchitectProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    project_cost: "",
    location: "",
  });
  
  const [housePlanFile, setHousePlanFile] = useState<File | null>(null);
  const [maquetteFiles, setMaquetteFiles] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [housePlanPreview, setHousePlanPreview] = useState<string>("");
  const [maquettePreviews, setMaquettePreviews] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const token = localStorage.getItem("token");

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/architect-projects");
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast({
        title: t("error"),
        description: "Failed to fetch projects",
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
    fetchProjects();
  }, [token, navigate, fetchProjects]);

  const onHousePlanDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setHousePlanFile(file);
      if (file.type.startsWith('image/')) {
        setHousePlanPreview(URL.createObjectURL(file));
      }
    }
  };

  const onMaquetteDrop = (acceptedFiles: File[]) => {
    const newFiles = [...maquetteFiles, ...acceptedFiles];
    setMaquetteFiles(newFiles);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setMaquettePreviews(newPreviews);
  };

  const onImagesDrop = (acceptedFiles: File[]) => {
    const newImages = [...images, ...acceptedFiles];
    setImages(newImages);
    const newPreviews = newImages.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const { getRootProps: getHousePlanRootProps, getInputProps: getHousePlanInputProps } = useDropzone({
    onDrop: onHousePlanDrop,
    accept: { 
      "image/*": [".jpeg", ".png", ".jpg"],
      "application/pdf": [".pdf"]
    },
    multiple: false,
  });

  const { getRootProps: getMaquetteRootProps, getInputProps: getMaquetteInputProps } = useDropzone({
    onDrop: onMaquetteDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg"] },
    multiple: true,
  });

  const { getRootProps: getImagesRootProps, getInputProps: getImagesInputProps } = useDropzone({
    onDrop: onImagesDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg"] },
    multiple: true,
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    const newPreviews = newImages.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const removeMaquette = (index: number) => {
    const newFiles = maquetteFiles.filter((_, i) => i !== index);
    setMaquetteFiles(newFiles);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setMaquettePreviews(newPreviews);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    
    if (housePlanFile) data.append("house_plan", housePlanFile);
    maquetteFiles.forEach(file => {
      data.append("maquette[]", file);
    });
    images.forEach(file => {
      data.append("images[]", file);
    });

    try {
      if (isEditing !== null) {
        await apiClient.put(`/architect-projects/${isEditing}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast({ title: t("success"), description: "Project updated successfully" });
      } else {
        await apiClient.post("/architect-projects", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast({ title: t("success"), description: "Project created successfully" });
      }
      
      await fetchProjects();
      resetForm();
    } catch (error) {
      console.error("Failed to save project:", error);
      let errorMessage = "Failed to save project";
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
      project_cost: "",
      location: "",
    });
    setHousePlanFile(null);
    setMaquetteFiles([]);
    setImages([]);
    setHousePlanPreview("");
    setMaquettePreviews([]);
    setImagePreviews([]);
    setIsEditing(null);
    setShowForm(false);
  };

  const handleEdit = (project: ArchitectProject) => {
    setIsEditing(project.id);
    setFormData({
      name: project.name,
      description: project.description,
      project_cost: project.project_cost.toString(),
      location: project.location,
    });
    if (project.house_plan_url) setHousePlanPreview(project.house_plan_url);
    setMaquettePreviews(project.maquettes || []);
    setImages([]);
    setImagePreviews(project.images || []);
    setShowForm(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteProjectId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteProjectId === null) return;

    try {
      await apiClient.delete(`/architect-projects/${deleteProjectId}`);
      toast({ title: t("success"), description: "Project deleted successfully" });
      await fetchProjects();
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast({
        title: t("error"),
        description: "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setDeleteProjectId(null);
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">
                {isEditing ? "Edit House Plan" : "Add New House Plan"}
              </h1>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Project Name *</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleInputChange} 
                          placeholder="e.g., Modern Villa Design" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea 
                          id="description" 
                          name="description" 
                          value={formData.description} 
                          onChange={handleInputChange} 
                          placeholder="Detailed description of the project" 
                          required 
                          rows={6} 
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="project_cost">Project Cost (XAF) *</Label>
                          <Input 
                            id="project_cost" 
                            name="project_cost" 
                            type="number" 
                            value={formData.project_cost} 
                            onChange={handleInputChange} 
                            placeholder="5000000" 
                            required 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location">Location *</Label>
                          <Input
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            placeholder="e.g., Douala, Bonapriso"
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Files */}
                <div className="space-y-6">
                  {/* House Plan */}
                  <Card>
                    <CardHeader>
                      <CardTitle>House Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div {...getHousePlanRootProps()} className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary">
                        <input {...getHousePlanInputProps()} />
                        {housePlanPreview ? (
                          housePlanPreview.endsWith('.pdf') ? (
                            <FileText className="h-16 w-16 mx-auto text-primary" />
                          ) : (
                            <img src={housePlanPreview} alt="Plan" className="max-h-32 mx-auto" />
                          )
                        ) : (
                          <div>
                            <Upload className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">Upload house plan (PDF/Image)</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Maquette */}
                  <Card>
                    <CardHeader>
                      <CardTitle>3D Maquette</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div {...getMaquetteRootProps()} className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary">
                        <input {...getMaquetteInputProps()} />
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Upload 3D maquette(s)</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {maquettePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`preview ${index}`} className="h-20 w-20 object-cover rounded" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={() => removeMaquette(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Images */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Images</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div {...getImagesRootProps()} className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary">
                        <input {...getImagesInputProps()} />
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Upload images</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`preview ${index}`} className="h-20 w-20 object-cover rounded" />
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="icon" 
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full" 
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Update Project" : "Create Project"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">House Plans & Projects</h1>
              <Button onClick={() => { setShowForm(true); setIsEditing(null); }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add New Project
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {projects.map(project => (
                <Card key={project.id} className="overflow-hidden">
                  <img
                    src={project.maquettes[0] || project.images[0] || "/placeholder.svg"}
                    alt={project.name}
                    className="h-48 w-full object-cover"
                  />
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg line-clamp-1">{project.name}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 mt-1">{project.description}</p>
                    <p className="font-bold text-xl mt-2">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "XAF",
                      }).format(project.project_cost)}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(project)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(project.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {projects.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Button onClick={() => setShowForm(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Your First Project
                </Button>
              </Card>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteProjectId !== null} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchitectProjectsPage;