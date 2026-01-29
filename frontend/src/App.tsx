import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { HostProvider } from "@/contexts/HostContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter(
  [
    { path: "/", Component: Dashboard },
    { path: "/marketplace", lazy: async () => ({ Component: (await import("./pages/SearchResults")).default }) },
    { path: "/hosts/:id", lazy: async () => ({ Component: (await import("./pages/HostProfile")).default }) },
    { path: "/product/:id", lazy: async () => ({ Component: (await import("./pages/ListingDetails")).default }) },
    { path: "/messages", lazy: async () => ({ Component: (await import("./pages/Messages")).default }) },
    { path: "/bookings", element: <ProtectedRoute />, children: [{ index: true, lazy: async () => ({ Component: (await import("./pages/MyBookings")).default }) }] },
    { path: "/webauth-login", lazy: async () => ({ Component: (await import("./pages/WebAuthLogin")).default }) },
    { path: "/wishlist", lazy: async () => ({ Component: (await import("./pages/Wishlist")).default }) },
    {
      path: "/account",
      element: <ProtectedRoute />,
      children: [
        { index: true, lazy: async () => ({ Component: (await import("./pages/account/AccountSettings")).default }) },
      ], 
    },
    {
      path: "/admin",
      element: <ProtectedRoute />,
      children: [
        { index: true, lazy: async () => ({ Component: (await import("./pages/admin/AdminDashboard")).default }) },
      ],
    },
    {
      path: "/host",
      element: <ProtectedRoute />,
      children: [
        { path: "intro", lazy: async () => ({ Component: (await import("./pages/host/Intro")).default }) },
        { path: "amenities", lazy: async () => ({ Component: (await import("./pages/host/Amenities")).default }) },
        { path: "location", lazy: async () => ({ Component: (await import("./pages/host/Location")).default }) },
        { path: "description", lazy: async () => ({ Component: (await import("./pages/host/Description")).default }) },
        { path: "title", lazy: async () => ({ Component: (await import("./pages/host/TitlePage")).default }) },
        { path: "photos", lazy: async () => ({ Component: (await import("./pages/host/PhotoUpload")).default }) },
        { path: "pricing", lazy: async () => ({ Component: (await import("./pages/host/Pricing")).default }) },
        { path: "safety", lazy: async () => ({ Component: (await import("./pages/host/SafetyDetails")).default }) },
        { path: "booking-settings", lazy: async () => ({ Component: (await import("./pages/host/BookingSettings")).default }) },
        { path: "preview", lazy: async () => ({ Component: (await import("./pages/host/Preview")).default }) },
        { path: "dashboard", lazy: async () => ({ Component: (await import("./pages/host/HostDashboard")).default }) },
        { path: "reservations", lazy: async () => ({ Component: (await import("./pages/host/Reservations")).default }) },
        { path: "calendar", lazy: async () => ({ Component: (await import("./pages/host/HostCalendar")).default }) },
        { path: "editor/:id/bedroom", lazy: async () => ({ Component: (await import("./pages/host/BedroomEditor")).default }) },
        { path: "editor/:id/bathroom", lazy: async () => ({ Component: (await import("./pages/host/BathroomEditor")).default }) },
        { path: "editor/:id", lazy: async () => ({ Component: (await import("./pages/host/ListingEditor")).default }) },
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
    <AuthProvider>
      <WishlistProvider>
        <MessagingProvider>
          <HostProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <RouterProvider router={router} />
            </TooltipProvider>
          </HostProvider>
        </MessagingProvider>
      </WishlistProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;



