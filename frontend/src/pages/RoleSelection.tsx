import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ShoppingBag, Store, Loader2 } from "lucide-react";
import axios from "axios";

const RoleSelection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const userId = 1; // Hardcoded user ID


  const handleRoleSelection = async (role: "buyer" | "seller") => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      await apiClient.post("/roles", { role });

      toast({
        title: "Success!",
        description: t("role_registered_successfully", { role }),
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
            {t("choose_your_role")}
          </h1>
          <p className="text-primary-foreground/90">
            {t("how_would_you_like_to_use_kamerlink")}
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
              <CardTitle className="text-2xl">{t("buyer")}</CardTitle>
              <CardDescription>
                {t("browse_and_purchase_products")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>• {t("browse_products_by_category")}</li>
                <li>• {t("search_and_filter_listings")}</li>
                <li>• {t("view_seller_contact_information")}</li>
                <li>• {t("discover_local_deals")}</li>
              </ul>
              <Button
                onClick={() => handleRoleSelection("buyer")}
                disabled={isLoading}
                className="w-full"
                variant="secondary"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("continue_as_buyer")}
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
              <CardTitle className="text-2xl">{t("seller")}</CardTitle>
              <CardDescription>
                {t("list_and_sell_your_products")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>• {t("create_product_listings")}</li>
                <li>• {t("manage_your_inventory")}</li>
                <li>• {t("set_your_own_prices")}</li>
                <li>• {t("connect_with_local_buyers")}</li>
              </ul>
              <Button
                onClick={() => handleRoleSelection("seller")}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("continue_as_seller")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
