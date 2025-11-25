import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "@/api/client";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  return token ? <Outlet /> : <Navigate to="/webauth-login" replace />;
};
