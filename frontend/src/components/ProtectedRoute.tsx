import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "@/api/client";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = () => {
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const location = useLocation();
  const redirect = encodeURIComponent(`${location.pathname}${location.search}` || "/");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await apiClient.get("/account/me");
        if (mounted) setOk(true);
      } catch {
        if (mounted) setOk(false);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [location.key]);

  if (checking) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }
  return ok ? <Outlet /> : <Navigate to={`/webauth-login?redirect=${redirect}`} replace />;
};
