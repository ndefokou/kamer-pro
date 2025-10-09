import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ShoppingBag, Store, Loader2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const RoleSelection = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
    } else {
      try {
        const decoded: { id: number } = jwtDecode(token);
        setUserId(decoded.id);
        checkUserRole();
      } catch (error) {
        navigate("/auth");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const checkUserRole = async () => {
    try {
      const { data } = await apiClient.get("/roles");
      if (data?.role === "seller") {
        navigate("/seller-dashboard");
      } else if (data?.role === "buyer") {
        navigate("/marketplace");
      }
    } catch (error) {
      // User doesn't have a role yet, so we stay on this page.
    }
  };

  const handleRoleSelection = async (role: "buyer" | "seller") => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      await apiClient.post("/roles", { role });

      toast({
        title: "Success!",
        description: `You are now registered as a ${role}.`,
      });

      if (role === "seller") {
        navigate("/seller-dashboard");
      } else {
        navigate("/marketplace");
      }
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-foreground mb-2">
            Choose Your Role
          </h1>
          <p className="text-primary-foreground/90">
            How would you like to use KamerLink?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-elevated hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-secondary p-4 rounded-full">
                  <ShoppingBag className="h-10 w-10 text-secondary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">Buyer</CardTitle>
              <CardDescription>
                Browse and purchase products from sellers in Yaoundé
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>• Browse products by category</li>
                <li>• Search and filter listings</li>
                <li>• View seller contact information</li>
                <li>• Discover local deals</li>
              </ul>
              <Button
                onClick={() => handleRoleSelection("buyer")}
                disabled={isLoading}
                className="w-full"
                variant="secondary"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue as Buyer
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elevated hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-primary p-4 rounded-full">
                  <Store className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">Seller</CardTitle>
              <CardDescription>
                List and sell your products to buyers in Yaoundé
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>• Create product listings</li>
                <li>• Manage your inventory</li>
                <li>• Set your own prices</li>
                <li>• Connect with local buyers</li>
              </ul>
              <Button
                onClick={() => handleRoleSelection("seller")}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue as Seller
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
