import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

interface ArchitectProject {
  id: number;
  name: string;
  description: string;
  project_cost: number;
  house_plan_url?: string;
  maquettes: string[];
  images: string[];
}

const ProjectsPage = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<ArchitectProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/architect-projects/all");
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
        <h1 className="text-3xl font-bold mb-8">All Projects</h1>
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
              </CardContent>
            </Card>
          ))}
        </div>
        {projects.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No projects found.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;