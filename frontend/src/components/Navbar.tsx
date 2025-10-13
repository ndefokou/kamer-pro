import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getRole } from "@/api/client";
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const role = await getRole();
      setUserRole(role.role);
    } catch (error) {
      console.error("Failed to get user role:", error);
    }
  };


  return (
    <nav className="bg-primary text-primary-foreground shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <Store className="h-6 w-6" />
            <span className="text-xl font-bold">KamerLink</span>
          </Link>

          <div className="flex items-center space-x-4">
            {userRole === "seller" && (
              <Link to="/seller-dashboard">
                <Button variant="secondary" size="sm">
                  {t("dashboard")}
                </Button>
              </Link>
            )}
            {(userRole === "buyer" || userRole === "seller") && (
              <Link to="/marketplace">
                <Button variant="secondary" size="sm">
                  {t("marketplace")}
                </Button>
              </Link>
            )}

            <Link to="/role-selection">
              <Button variant="secondary" size="sm">
                {t("change_role")}
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => i18n.changeLanguage("fr")}>
                  Français
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
