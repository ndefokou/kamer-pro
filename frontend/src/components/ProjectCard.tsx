import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { getImageUrl } from "@/lib/utils";

interface ArchitectProject {
  id: number;
  name: string;
  description: string;
  project_cost: number;
  location: string;
  house_plan_url?: string;
  images: string[];
  maquettes: string[];
}

interface ProjectCardProps {
  project: ArchitectProject;
  className?: string;
}

const ProjectCard = ({ project, className }: ProjectCardProps) => {
  const { t } = useTranslation();
  const displayImage =
    project.images?.[0] || project.maquettes?.[0] || project.house_plan_url;

  return (
    <Card className={`shadow-soft hover:shadow-elevated transition-shadow flex flex-col h-full ${className}`}>
      <Link to={`/project/${project.id}`}>
        {displayImage && (
          <div className="h-32 sm:h-40 md:h-48 overflow-hidden rounded-t-lg relative flex-shrink-0">
            <img
              src={getImageUrl(displayImage)}
              alt={project.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </Link>
      <CardHeader className="p-2 sm:p-3 flex-grow-0">
        <div className="flex justify-between items-start gap-1 sm:gap-2">
          <Link to={`/project/${project.id}`} className="flex-1 min-w-0">
            <CardTitle className="text-xs sm:text-sm hover:text-primary transition-colors line-clamp-2">
              {project.name}
            </CardTitle>
          </Link>
        </div>
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{project.location}</span>
        </div>
        <CardDescription className="line-clamp-2 text-xs mt-1">
          {project.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 pt-0 flex-grow">
        <div className="space-y-1">
          <div className="text-sm font-bold text-primary">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "XAF",
            }).format(project.project_cost)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-2 sm:p-3 pt-0 mt-auto">
        <Badge variant="secondary">{t("project")}</Badge>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;