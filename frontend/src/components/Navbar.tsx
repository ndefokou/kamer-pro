import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, Globe, Menu, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getRoles } from "@/api/client";
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const role = await getRoles();
      setUserRole(role.role);
    } catch (error) {
      console.error("Failed to get user role:", error);
    }
  };

  const NavLinks = ({ mobile = false }) => (
    <div className={`flex ${mobile ? 'flex-col space-y-4' : 'items-center space-x-4'}`}>
      <Link to="/marketplace" onClick={() => mobile && setIsOpen(false)}>
        <Button variant="secondary" size="sm" className={mobile ? 'w-full justify-start' : ''}>
          {t("marketplace")}
        </Button>
      </Link>
      {userRole === "seller" && (
        <Link to="/seller-dashboard" onClick={() => mobile && setIsOpen(false)}>
          <Button variant="secondary" size="sm" className={mobile ? 'w-full justify-start' : ''}>
            {t("dashboard")}
          </Button>
        </Link>
      )}

      <Link to="/role-selection" onClick={() => mobile && setIsOpen(false)}>
        <Button variant="secondary" size="sm" className={mobile ? 'w-full justify-start' : ''}>
          {t("change_role")}
        </Button>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size={mobile ? "sm" : "icon"} className={mobile ? 'w-full justify-start' : ''}>
            <Globe className="h-4 w-4" />
            {mobile && <span className="ml-2">Language</span>}
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
  );

  return (
    <nav className="bg-primary text-primary-foreground shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <Store className="h-6 w-6" />
            <span className="text-xl font-bold">KamerLink</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex">
            <NavLinks />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground">
                  {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                <div className="flex flex-col space-y-4 mt-8">
                  <NavLinks mobile={true} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;