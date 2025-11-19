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
import { ShoppingBag, Store, Loader2 } from "lucide-react";
import axios from "axios";

const RoleSelection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        const response = await apiClient.get("/company");
        if (response.data) {
          navigate("/company");
        }
      } catch (error) {
        // Handle error silently or show a toast
        console.error("Failed to fetch user company:", error);
      }
    };

    fetchUserCompany();
  }, [navigate]);

  const handleRoleSelection = async (role: "buyer" | "seller") => {
    setIsLoading(true);
    try {
      await apiClient.post("/roles", { role });

      toast({
        title: t("success"),
        description: t("role_registered_successfully", { role }),
      });

      localStorage.setItem("role", role);
      if (role === "seller") {
        navigate("/company");
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
            {t("how would you like to use kamerlink")}
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
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
