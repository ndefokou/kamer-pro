import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import apiClient from "@/api/client";
import { useToast } from "@/components/ui/use-toast";

interface shopData {
  email: string;
  phone: string;
  location: string;
}

interface companyettingsProps {
  shopData: shopData;
  onshopDataChange: (newshopData: shopData) => void;
}

const companyettings = ({ shopData, onshopDataChange }: companyettingsProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    onshopDataChange({ ...shopData, [id]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post("/shop", shopData);
      toast({
        title: t("shop settings saved"),
        description: t("your shop information has been updated"),
      });
    } catch (error) {
      console.error("Failed to save shop settings:", error);
      toast({
        title: t("error"),
        description: t("failed to save shop settings"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("my shop")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("contact email")}</Label>
            <Input
              id="email"
              type="email"
              value={shopData.email}
              onChange={handleChange}
              placeholder="shop@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("contact phone")}</Label>
            <Input
              id="phone"
              type="tel"
              value={shopData.phone}
              onChange={handleChange}
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{t("location")}</Label>
            <Input
              id="location"
              value={shopData.location}
              onChange={handleChange}
              placeholder="e.g., Douala, Akwa"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("save changes")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default companyettings;