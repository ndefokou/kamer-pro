import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { toast } from "@/hooks/use-toast";
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
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  FileText,
  Building2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ArchitectProject {
  id: number;
  architect_company_id: number;
  user_id: number;
  name: string;
  description: string;
  project_cost: number;
  location: string;
  house_plan_url?: string;
  created_at: string;
  updated_at: string;
  maquettes: string[];
  images: string[];
}

interface ArchitectCompany {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
}

const ProjectDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ArchitectProject | null>(null);
  const [company, setCompany] = useState<ArchitectCompany | null>(null);
  const [similarProjects, setSimilarProjects] = useState<ArchitectProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true);
      try {
        // Fetch all projects and find the one we need
        const response = await apiClient.get("/architect-projects/all");
        const foundProject = response.data.find((p: ArchitectProject) => p.id === parseInt(id || "0"));
        
        if (foundProject) {
          setProject(foundProject);
          
          // Set first available image
          if (foundProject.maquettes && foundProject.maquettes.length > 0) {
            setSelectedImage(foundProject.maquettes[0]);
          } else if (foundProject.images && foundProject.images.length > 0) {
            setSelectedImage(foundProject.images[0]);
          }

          // Fetch similar projects (same location or similar price range)
          const similar = response.data
            .filter((p: ArchitectProject) => 
              p.id !== foundProject.id && 
              (p.location === foundProject.location || 
               Math.abs(p.project_cost - foundProject.project_cost) < foundProject.project_cost * 0.5)
            )
            .slice(0, 6);
          setSimilarProjects(similar);

          // Fetch architect company details
          try {
            const companyResponse = await apiClient.get("/architect-company");
            setCompany(companyResponse.data);
          } catch (error) {
            console.error("Failed to fetch company:", error);
          }
        }
      } catch (error) {
        console.error("Failed to fetch project:", error);
      }
      setIsLoading(false);
    };

    fetchProject();
  }, [id]);

  const handleContactArchitect = () => {
    if (!token) {
      navigate("/webauth-login");
      return;
    }
    if (company) {
      // Format phone for WhatsApp
      let cleanedPhone = company.phone.replace(/[-\s()]/g, "");
      if (!cleanedPhone.startsWith("+")) {
        cleanedPhone = `+237${cleanedPhone}`;
      }
      const message = `Hello, I'm interested in your project "${project?.name}".`;
      const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
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

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Project not found</p>
        </div>
      </div>
    );
  }

  const allImages = [...(project.maquettes || []), ...(project.images || [])];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{project.name}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Architectural Project
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="mb-4">
                <img
                  src={selectedImage || "/placeholder.svg"}
                  alt={project.name}
                  className="w-full max-h-96 object-contain rounded-lg border bg-muted"
                />
              </div>
              <div className="flex space-x-2 overflow-x-auto">
                {allImages.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`thumbnail ${index + 1}`}
                    className={`h-20 w-20 object-cover rounded-md cursor-pointer border-2 ${
                      selectedImage === image
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                    onClick={() => setSelectedImage(image)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{project.description}</p>
              </div>
              <div className="text-3xl font-bold text-primary">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                }).format(project.project_cost)}
              </div>
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                {project.location}
              </div>

              {project.house_plan_url && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">House Plan</h3>
                  <a 
                    href={project.house_plan_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <FileText className="h-5 w-5" />
                    View House Plan
                  </a>
                </div>
              )}

              {company && (
                <div className="border-t pt-4">
                  <h3 className="text-xl font-semibold mb-4">Architect Firm</h3>
                  <div className="flex items-center gap-4 mb-4">
                    {company.logo_url && (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-lg">{company.name}</p>
                      <p className="text-sm text-muted-foreground">{company.location}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {company.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-primary" />
                        <a
                          href={`tel:${company.phone}`}
                          className="hover:underline"
                        >
                          {company.phone}
                        </a>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-primary" />
                        <a
                          href={`mailto:${company.email}`}
                          className="hover:underline"
                        >
                          {company.email}
                        </a>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleContactArchitect} className="mt-4 w-full">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Contact via WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Details Tabs */}
        <Card className="mt-8">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                Project Details
              </TabsTrigger>
              <TabsTrigger
                value="gallery"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                Gallery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="p-6">
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4">About This Project</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {project.description}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Location</h4>
                    <p className="text-muted-foreground">{project.location}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Project Cost</h4>
                    <p className="text-muted-foreground">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "XAF",
                      }).format(project.project_cost)}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {project.maquettes.length > 0 && (
                  <>
                    <h3 className="col-span-full text-xl font-semibold">3D Maquettes</h3>
                    {project.maquettes.map((image, index) => (
                      <img
                        key={`maquette-${index}`}
                        src={image}
                        alt={`Maquette ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(image)}
                      />
                    ))}
                  </>
                )}
                {project.images.length > 0 && (
                  <>
                    <h3 className="col-span-full text-xl font-semibold mt-4">Additional Images</h3>
                    {project.images.map((image, index) => (
                      <img
                        key={`image-${index}`}
                        src={image}
                        alt={`Project image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(image)}
                      />
                    ))}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {similarProjects.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-6">Similar Projects</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {similarProjects.map((p) => (
                <Card 
                  key={p.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/project/${p.id}`)}
                >
                  <img
                    src={p.maquettes[0] || p.images[0] || "/placeholder.svg"}
                    alt={p.name}
                    className="h-32 w-full object-cover"
                  />
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                    <p className="font-bold text-sm mt-2">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "XAF",
                      }).format(p.project_cost)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;