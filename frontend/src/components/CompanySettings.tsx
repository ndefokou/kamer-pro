import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import apiClient from "@/api/client";
import { useToast } from "@/components/ui/use-toast";

interface companyData {
  email: string;
  phone: string;
  location: string;
}

interface companyettingsProps {
  companyData: companyData;
  oncompanyDataChange: (newcompanyData: companyData) => void;
}

const companyettings = ({ companyData, oncompanyDataChange }: companyettingsProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    oncompanyDataChange({ ...companyData, [id]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post("/company", companyData);
      toast({
        title: t("company settings saved"),
        description: t("your company information has been updated"),
      });
    } catch (error) {
      console.error("Failed to save company settings:", error);
      toast({
        title: t("error"),
        description: t("failed to save company settings"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("my company")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("contact email")}</Label>
            <Input
              id="email"
              type="email"
              value={companyData.email}
              onChange={handleChange}
              placeholder="company@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("contact phone")}</Label>
            <Input
              id="phone"
              type="tel"
              value={companyData.phone}
              onChange={handleChange}
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{t("location")}</Label>
            <Input
              id="location"
              value={companyData.location}
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