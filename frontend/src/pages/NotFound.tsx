import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">{t("oops page not found")}</p>
        <div className="flex flex-col gap-4 items-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("Go Back")}
          </Button>
          <a href="/" className="text-primary hover:underline font-medium">
            {t("return to home")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
