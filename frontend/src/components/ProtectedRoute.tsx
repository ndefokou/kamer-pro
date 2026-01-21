import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = () => {
  const location = useLocation();
  const redirect = encodeURIComponent(`${location.pathname}${location.search}` || "/");
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }
  return user ? <Outlet /> : <Navigate to={`/webauth-login?redirect=${redirect}`} replace />;
};
