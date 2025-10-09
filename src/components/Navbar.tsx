import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logout, getRole } from "@/api/client";

const Navbar = () => {
  const navigate = useNavigate();
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

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
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
                  Dashboard
                </Button>
              </Link>
            )}
            {userRole === "buyer" && (
              <Link to="/marketplace">
                <Button variant="secondary" size="sm">
                  Marketplace
                </Button>
              </Link>
            )}
            <Button
              onClick={handleLogout}
              variant="secondary"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
