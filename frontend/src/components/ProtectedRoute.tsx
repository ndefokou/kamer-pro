import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "@/api/client";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const redirect = encodeURIComponent(`${location.pathname}${location.search}` || "/");
  return token ? <Outlet /> : <Navigate to={`/webauth-login?redirect=${redirect}`} replace />;
};
