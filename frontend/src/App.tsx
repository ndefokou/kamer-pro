import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Index from "./pages/Index";
import RoleSelection from "./pages/RoleSelection";
import Marketplace from "./pages/Marketplace";
import SellerDashboard from "./pages/SellerDashboard";
import NotFound from "./pages/NotFound";
import ProductDetails from "./pages/ProductDetails";
import { WebAuthLogin } from "./pages/WebAuthLogin";
import { WebAuthRegister } from "./pages/WebAuthRegister";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/", element: <Index /> },
    { path: "/role-selection", element: <RoleSelection /> },
    { path: "/marketplace", element: <Marketplace /> },
    { path: "/seller-dashboard", element: <SellerDashboard /> },
    { path: "/product/:id", element: <ProductDetails /> },
    { path: "/webauth-login", element: <WebAuthLogin /> },
    { path: "/webauth-register", element: <WebAuthRegister /> },
    { path: "*", element: <NotFound /> },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
