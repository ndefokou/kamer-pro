import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import apiClient from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Loader2, Building2, MapPin, Mail, Phone, FileText } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import ProjectCard from "@/components/ProjectCard";

interface ArchitectCompany {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  created_at: string;
  project_count?: number;
}

interface ArchitectProject {
  id: number;
  name: string;
  description: string;
  project_cost: number;
  location: string;
  house_plan_url?: string;
  images: string[];
  maquettes: string[];
  architect_company_id: number;
}

const ArchitectFirmPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [company, setCompany] = useState<ArchitectCompany | null>(null);
  const [projects, setProjects] = useState<ArchitectProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/architect-company/${id}`);
      setCompany(response.data);
    } catch (error) {
      console.error("Failed to fetch architect company:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchProjects = useCallback(async () => {
    if (!id) return;
    try {
      const response = await apiClient.get(`/architect-projects/company/${id}`);
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
    fetchProjects();
  }, [fetchCompany, fetchProjects]);

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

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>{t("architectFirmPage.notFound", "Architect firm not found.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="p-0">
            {company.banner_url && (
              <div className="h-48 md:h-64 overflow-hidden rounded-t-lg">
                <img
                  src={getImageUrl(company.banner_url)}
                  alt="Firm banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {company.logo_url && (
                  <img
                    src={getImageUrl(company.logo_url)}
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

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("architectFirmPage.totalProjects", "Total Projects")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("architectFirmPage.memberSince", "Member Since")}</p>
                  <p className="text-lg font-bold">
                    {new Date(company.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("architectFirmPage.projectsTitle", "House Plans & Projects")}</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {t("architectFirmPage.noProjects", "No projects yet")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    className="w-full"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ArchitectFirmPage;