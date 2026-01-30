import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { HostProvider } from "@/contexts/HostContext";
import { AuthProvider } from "@/contexts/AuthContext";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const router = createBrowserRouter(
  [
    { path: "/", element: <Suspense fallback={<div />}><Dashboard /></Suspense> },
    { path: "/marketplace", lazy: async () => ({ Component: (await import("./pages/SearchResults")).default }) },
    { path: "/hosts/:id", lazy: async () => ({ Component: (await import("./pages/HostProfile")).default }) },
    { path: "/product/:id", lazy: async () => ({ Component: (await import("./pages/ListingDetails")).default }) },
    { path: "/messages", lazy: async () => ({ Component: (await import("./pages/Messages")).default }) },
    { path: "/bookings", element: <ProtectedRoute />, children: [{ index: true, lazy: async () => ({ Component: (await import("./pages/MyBookings")).default }) }] },
    { path: "/webauth-login", lazy: async () => ({ Component: (await import("./pages/WebAuthLogin")).default }) },
    { path: "/wishlist", lazy: async () => ({ Component: (await import("./pages/Wishlist")).default }) },
    { path: "/calendar", lazy: async () => ({ Component: (await import("./pages/Calendar")).default }) },
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
        { path: "listings", lazy: async () => ({ Component: (await import("./pages/host/Reservations")).default }) },
        { path: "listing-editor/:id", lazy: async () => ({ Component: (await import("./pages/host/ListingEditor")).default }) },
        { path: "bedroom-editor/:id", lazy: async () => ({ Component: (await import("./pages/host/BedroomEditor")).default }) },
        { path: "bathroom-editor/:id", lazy: async () => ({ Component: (await import("./pages/host/BathroomEditor")).default }) },
      ],
    },
    { path: "*", element: <Suspense fallback={<div />}><NotFound /></Suspense> },
  ],
  {
    // @ts-ignore
    hydrateFallbackElement: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    ),
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  },
);

import { HelmetProvider } from "react-helmet-async";

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WishlistProvider>
          <MessagingProvider>
            <HostProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <PWAInstallPrompt />
                <RouterProvider router={router} />
              </TooltipProvider>
            </HostProvider>
          </MessagingProvider>
        </WishlistProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;



