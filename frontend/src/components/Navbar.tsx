import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ShoppingCart,
  Heart,
  User,
  LogOut,
  Menu,
  X,
  Globe,
  MessageSquare,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useMessaging } from "@/hooks/useMessaging";
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
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { unreadCount } = useMessaging();
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    setIsMobileMenuOpen(false);
    navigate("/");
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
            <Store className="h-6 w-6" />
            <span className="text-xl font-bold hidden sm:inline">
              KamerLink
            </span>
            <span className="text-xl font-bold sm:hidden">KL</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/marketplace">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                Marketplace
              </Button>
            </Link>

            <Link to="/seller-dashboard">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                Seller Dashboard
              </Button>
            </Link>

            {token && (
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

                <Link to="/cart" className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground"
                        variant="secondary"
                      >
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </>
            )}

            <Link to="/messages" className="relative">
             <Button
               variant="ghost"
               size="icon"
               className="text-primary-foreground hover:bg-primary-foreground/10"
             >
               <MessageSquare className="h-5 w-5" />
               {unreadCount > 0 && (
                 <Badge
                   className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground"
                   variant="secondary"
                 >
                   {unreadCount}
                 </Badge>
               )}
             </Button>
           </Link>

            {token ? (
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
                  <DropdownMenuItem onClick={() => navigate("/marketplace")}>
                    Marketplace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/seller-dashboard")}
                  >
                    Seller Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/wishlist")}>
                    <Heart className="h-4 w-4 mr-2" />
                    Wishlist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/cart")}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart
                  </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => navigate("/messages")}>
                   <MessageSquare className="h-4 w-4 mr-2" />
                   Messages
                 </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/webauth-login">
                <Button variant="secondary">Login</Button>
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
            {token && (
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

                <Link to="/cart" className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground text-xs"
                        variant="secondary"
                      >
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </>
            )}

           <Link to="/messages" className="relative">
             <Button
               variant="ghost"
               size="icon"
               className="text-primary-foreground hover:bg-primary-foreground/10"
             >
               <MessageSquare className="h-5 w-5" />
               {unreadCount > 0 && (
                 <Badge
                   className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground text-xs"
                   variant="secondary"
                 >
                   {unreadCount}
                 </Badge>
               )}
             </Button>
           </Link>

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
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Navigate through the application
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {token && (
                    <div className="flex items-center space-x-2 pb-4 border-b">
                      <User className="h-5 w-5" />
                      <span className="font-semibold">
                        {username || "User"}
                      </span>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleNavigation("/marketplace")}
                  >
                    <Store className="h-5 w-5 mr-2" />
                    Marketplace
                  </Button>

                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleNavigation("/seller-dashboard")}
                  >
                    <Store className="h-5 w-5 mr-2" />
                    Seller Dashboard
                  </Button>

                  {token && (
                    <>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => handleNavigation("/wishlist")}
                      >
                        <Heart className="h-5 w-5 mr-2" />
                        Wishlist
                        {wishlistCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {wishlistCount}
                          </Badge>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => handleNavigation("/cart")}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Cart
                        {cartCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {cartCount}
                          </Badge>
                        )}
                      </Button>

                     <Button
                       variant="ghost"
                       className="justify-start"
                       onClick={() => handleNavigation("/messages")}
                     >
                       <MessageSquare className="h-5 w-5 mr-2" />
                       Messages
                       {unreadCount > 0 && (
                         <Badge variant="secondary" className="ml-auto">
                           {unreadCount}
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
                          Logout
                        </Button>
                      </div>
                    </>
                  )}

                  {!token && (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleNavigation("/webauth-login")}
                    >
                      Login
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
