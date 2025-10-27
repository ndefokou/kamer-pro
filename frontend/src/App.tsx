import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import Index from "./pages/Index";
import RoleSelection from "./pages/RoleSelection";
import Marketplace from "./pages/Marketplace";
import SellerDashboard from "./pages/SellerDashboard";
import NotFound from "./pages/NotFound";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Messages from "./pages/Messages";
import { WebAuthLogin } from "./pages/WebAuthLogin";
import { WebAuthRegister } from "./pages/WebAuthRegister";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/", Component: Index },
    { path: "/role-selection", Component: RoleSelection },
    { path: "/marketplace", Component: Marketplace },
    { path: "/product/:id", Component: ProductDetails },
    { path: "/webauth-login", Component: WebAuthLogin },
    { path: "/webauth-register", Component: WebAuthRegister },
    {
      element: <ProtectedRoute />,
      children: [
        { path: "/seller-dashboard", Component: SellerDashboard },
        { path: "/cart", Component: Cart },
        { path: "/wishlist", Component: Wishlist },
        { path: "/messages", Component: Messages },
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
      <CartProvider>
        <WishlistProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RouterProvider router={router} />
          </TooltipProvider>
        </WishlistProvider>
      </CartProvider>
    </MessagingProvider>
  </QueryClientProvider>
);

export default App;
