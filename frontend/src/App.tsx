import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import Index from "./pages/Index";
import RoleSelection from "./pages/RoleSelection";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";
import MyProducts from "./pages/MyProducts";
import ProductDetails from "./pages/ProductDetails";
import Wishlist from "./pages/Wishlist";
import Messages from "./pages/Messages";
import { WebAuthLogin } from "./pages/WebAuthLogin";
import { WebAuthRegister } from "./pages/WebAuthRegister";
import { ProtectedRoute } from "./components/ProtectedRoute";
import CompanyPage from "./pages/CompanyPage";
import ArchitectCompanyPage from "./pages/ArchitectCompanyPage";
import ArchitectProjectsPage from "./pages/ArchitectProjectsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetails from "./pages/ProjectDetails";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/", Component: Index },
    { path: "/role-selection", Component: RoleSelection },
    { path: "/marketplace", Component: Marketplace },
    { path: "/product/:id", Component: ProductDetails },
    { path: "/projects", Component: ProjectsPage },
    { path: "/project/:id", Component: ProjectDetails },
    { path: "/webauth-login", Component: WebAuthLogin },
    { path: "/webauth-register", Component: WebAuthRegister },
    {
      element: <ProtectedRoute />,
      children: [{ path: "/my-products", Component: MyProducts }],
    },
    {
      element: <ProtectedRoute />,
      children: [
        { path: "/wishlist", Component: Wishlist },
        { path: "/messages", Component: Messages },
        { path: "/company", Component: CompanyPage },
        { path: "/architect-company", Component: ArchitectCompanyPage },
        { path: "/architect-projects", Component: ArchitectProjectsPage },
      ],
    },
    { path: "*", Component: NotFound },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  },
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MessagingProvider>
      <WishlistProvider>
        <TooltipProvider>
          <Toaster />
            <Sonner />
            <RouterProvider router={router} />
          </TooltipProvider>
        </WishlistProvider>
    </MessagingProvider>
  </QueryClientProvider>
);

export default App;
