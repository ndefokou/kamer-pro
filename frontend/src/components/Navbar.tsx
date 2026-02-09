import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import apiClient, { getPublicPath } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Store,
  Heart,
  User,
  LogOut,
  Menu,
  Globe,
  Search,
} from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useMessaging } from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navbar = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const { wishlistCount } = useWishlist();
  const { unreadCount } = useMessaging();
  const username = localStorage.getItem("username");
  const { user, logout } = useAuth();
  const isAuth = !!user;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  // Auth state is now derived from AuthContext

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }
    navigate(`/marketplace?${params.toString()}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setIsMobileMenuOpen(false);
      navigate("/");
    }
  };

  const handleNavigation = (path: string) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "fr" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <nav className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/marketplace" className="flex items-center space-x-2">
            <img src={getPublicPath("logo.png")} alt="Le Mboko" className="h-8 w-8 object-contain rounded-lg" />
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t("search")}
                  className="w-full pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/marketplace">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                {t("marketplace")}
              </Button>
            </Link>

            <Link to="/find-architect">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                {t("findArchitect", "Find an Architect")}
              </Button>
            </Link>

            <Link to="/architect-company">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                {t("my firm")}
              </Button>
            </Link>

            <Link to="/company">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                {t("my company")}
              </Button>
            </Link>

            {isAuth && (
              <>
                <Link to="/wishlist" className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Heart className="h-5 w-5" />
                    {wishlistCount > 0 && (
                      <Badge
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground"
                        variant="secondary"
                      >
                        {wishlistCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

              </>
            )}


            {isAuth ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <User className="h-5 w-5 mr-2" />
                    <span className="hidden lg:inline">
                      {username || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/wishlist")}>
                    <Heart className="h-4 w-4 mr-2" />
                    {t("wishlist")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="secondary">{t("login")}</Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={toggleLanguage}
            >
              <Globe className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            {isAuth && (
              <>
                <Link to="/wishlist" className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Heart className="h-5 w-5" />
                    {wishlistCount > 0 && (
                      <Badge
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground text-xs"
                        variant="secondary"
                      >
                        {wishlistCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

              </>
            )}


            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-[400px]">
                <SheetHeader>
                  <SheetTitle>{t("menu")}</SheetTitle>
                  <SheetDescription>
                    {t("navigate through the application")}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {isAuth && (
                    <div className="flex items-center space-x-2 pb-4 border-b">
                      <User className="h-5 w-5" />
                      <span className="font-semibold">
                        {username || t("user")}
                      </span>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleNavigation("/marketplace")}
                  >
                    <Store className="h-5 w-5 mr-2" />
                    {t("marketplace")}
                  </Button>

                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleNavigation("/find-architect")}
                  >
                    <Store className="h-5 w-5 mr-2" />
                    {t("findArchitect", "Find an Architect")}
                  </Button>

                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleNavigation("/architect-company")}
                  >
                    <Store className="h-5 w-5 mr-2" />
                    {t("my firm")}
                  </Button>

                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleNavigation("/company")}
                  >
                    <Store className="h-5 w-5 mr-2" />
                    {t("my company")}
                  </Button>

                  {isAuth && (
                    <>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => handleNavigation("/wishlist")}
                      >
                        <Heart className="h-5 w-5 mr-2" />
                        {t("wishlist")}
                        {wishlistCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {wishlistCount}
                          </Badge>
                        )}
                      </Button>


                      <div className="border-t pt-4 mt-4">
                        <Button
                          variant="destructive"
                          className="w-full justify-start"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-5 w-5 mr-2" />
                          {t("logout")}
                        </Button>
                      </div>
                    </>
                  )}

                  {!isAuth && (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleNavigation("/login")}
                    >
                      {t("login")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={toggleLanguage}
                  >
                    <Globe className="h-5 w-5 mr-2" />
                    {t("change language")}
                  </Button>
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
