import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "@/api/client";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  return token ? <Outlet /> : <Navigate to="/webauth-login" replace />;
};

export const SellerProtectedRoute = () => {
  const token = localStorage.getItem("token");
  const [hasSellerRole, setHasSellerRole] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSellerRole = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user roles from backend
        const response = await apiClient.get("/roles");
        const userRole = response.data;
        
        // Check if user has seller role
        const isSeller = userRole && userRole.role === "seller";
        setHasSellerRole(isSeller);
        
        // Store in localStorage for quick access
        if (isSeller) {
          localStorage.setItem("role", "seller");
        }
      } catch (error) {
        console.error("Failed to fetch roles:", error);
        setHasSellerRole(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSellerRole();
  }, [token]);

  if (!token) {
    return <Navigate to="/webauth-login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasSellerRole) {
    return <Navigate to="/role-selection" replace />;
  }

  return <Outlet />;
};