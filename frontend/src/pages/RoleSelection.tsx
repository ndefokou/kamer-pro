import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ShoppingBag, Store, Loader2, Building2 } from "lucide-react";
import axios from "axios";

const RoleSelection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Removed automatic company fetch to prevent 404 errors
  // Users will be redirected based on their role selection

  const handleRoleSelection = async (role: "buyer" | "seller" | "architect") => {
    setIsLoading(true);
    try {
      await apiClient.post("/roles", { role });

      toast({
        title: t("success"),
        description: t("role_registered_successfully", { role }),
      });

      // Store role in localStorage
      localStorage.setItem("role", role);

      // Small delay to ensure localStorage is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate based on role
      if (role === "seller") {
        navigate("/company");
      } else if (role === "architect") {
        navigate("/architect-company");
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
        title: t("error"),
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
            {t("choose your role")}
          </h1>
          <p className="text-primary-foreground/90">
            {t("how would you like to use MboaMaison")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="shadow-elevated hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-secondary p-4 rounded-full">
                  <ShoppingBag className="h-10 w-10 text-secondary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">{t("buyer")}</CardTitle>
              <CardDescription>
                {t("browse and purchase products")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>• {t("browse products by category")}</li>
                <li>• {t("search and filter listings")}</li>
                <li>• {t("view seller contact information")}</li>
                <li>• {t("discover local deals")}</li>
              </ul>
              <Button
                onClick={() => handleRoleSelection("buyer")}
                disabled={isLoading}
                className="w-full"
                variant="secondary"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("continue as buyer")}
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
                {t("list and sell your products")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>• {t("create product listings")}</li>
                <li>• {t("manage your inventory")}</li>
                <li>• {t("set your own prices")}</li>
                <li>• {t("connect with local buyers")}</li>
              </ul>
              <Button
                onClick={() => handleRoleSelection("seller")}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("continue as seller")}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elevated hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-500 p-4 rounded-full">
                  <Building2 className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">{t("architect")}</CardTitle>
              <CardDescription>
                {t("design and showcase house plans")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>• {t("create your firm profile")}</li>
                <li>• {t("upload house plans and maquettes")}</li>
                <li>• {t("set project costs and details")}</li>
                <li>• {t("reach clients seeking designs")}</li>
              </ul>
              <Button
                onClick={() => handleRoleSelection("architect")}
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("register as an architect")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
