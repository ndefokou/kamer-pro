import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  return token ? <Outlet /> : <Navigate to="/webauth-login" replace />;
};

export const SellerProtectedRoute = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/webauth-login" replace />;
  }

  if (role !== "seller") {
    return <Navigate to="/role-selection" replace />;
  }

  return <Outlet />;
};