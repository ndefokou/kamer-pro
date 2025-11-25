import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { getImageUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

interface ArchitectCompany {
  id: number;
  name: string;
  location: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  project_count?: number;
}

const FindArchitectPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [architects, setArchitects] = useState<ArchitectCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArchitects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/architect-companies");
      setArchitects(response.data);
    } catch (error) {
      console.error("Failed to fetch architects:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchitects();
  }, [fetchArchitects]);

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
        <h1 className="text-3xl font-bold mb-8">{t("findArchitectPage.title", "Find an Architect")}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {architects.map(architect => (
            <Card
              key={architect.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/architect-firm/${architect.id}`)}
            >
              <img
                src={architect.banner_url ? getImageUrl(architect.banner_url) : "/placeholder.svg"}
                alt={architect.name}
                className="h-48 w-full object-cover"
              />
              <CardContent className="p-4">
                 <div className="flex items-center">
                    <img
                        src={architect.logo_url ? getImageUrl(architect.logo_url) : "/placeholder.svg"}
                        alt={`${architect.name} logo`}
                        className="h-12 w-12 rounded-full mr-4"
                    />
                    <div>
                        <h3 className="font-semibold text-lg line-clamp-1">{architect.name}</h3>
                        <p className="text-muted-foreground text-sm">{architect.location}</p>
                    </div>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2 mt-2">{architect.description}</p>
                <p className="font-bold text-sm mt-2">
                  {architect.project_count || 0} {t("projects", "Projects")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        {architects.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">{t("findArchitectPage.noArchitects", "No architects found.")}</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FindArchitectPage;

