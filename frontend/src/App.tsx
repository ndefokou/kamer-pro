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
import Intro from "./pages/host/Intro";
import Amenities from "./pages/host/Amenities";
import Location from "./pages/host/Location";
import Description from "./pages/host/Description";
import TitlePage from "./pages/host/TitlePage";
import PhotoUpload from "./pages/host/PhotoUpload";
import Pricing from "./pages/host/Pricing";
import SafetyDetails from "./pages/host/SafetyDetails";
import BookingSettings from "./pages/host/BookingSettings";
import Preview from "./pages/host/Preview";
import HostDashboard from "./pages/host/HostDashboard";
import Reservations from "./pages/host/Reservations";
import ListingEditor from "./pages/host/ListingEditor";
import BedroomEditor from "./pages/host/BedroomEditor";
import BathroomEditor from "./pages/host/BathroomEditor";
import HostCalendar from "./pages/host/HostCalendar";
import WebAuthLogin from "./pages/WebAuthLogin";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AccountSettings from "./pages/account/AccountSettings";
import ListingDetails from "./pages/ListingDetails";
import SearchResults from "./pages/SearchResults";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Wishlist from "./pages/Wishlist";
import HostProfile from "./pages/HostProfile";
import MyBookings from "./pages/MyBookings";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/", Component: Dashboard },
    { path: "/marketplace", Component: SearchResults },
    { path: "/hosts/:id", Component: HostProfile },
    { path: "/product/:id", Component: ListingDetails },
    { path: "/messages", Component: Messages },
    { path: "/bookings", element: <ProtectedRoute />, children: [{ index: true, Component: MyBookings }] },
    { path: "/webauth-login", Component: WebAuthLogin },
    { path: "/wishlist", Component: Wishlist },
    {
      path: "/account",
      element: <ProtectedRoute />,
      children: [
        { index: true, Component: AccountSettings },
      ],
    },
    {
      path: "/admin",
      element: <ProtectedRoute />,
      children: [
        { index: true, Component: AdminDashboard },
      ],
    },
    {
      path: "/host",
      element: <ProtectedRoute />,
      children: [
        { path: "intro", Component: Intro },
        { path: "amenities", Component: Amenities },
        { path: "location", Component: Location },
        { path: "description", Component: Description },
        { path: "title", Component: TitlePage },
        { path: "photos", Component: PhotoUpload },
        { path: "pricing", Component: Pricing },
        { path: "safety", Component: SafetyDetails },
        { path: "booking-settings", Component: BookingSettings },
        { path: "preview", Component: Preview },
        { path: "dashboard", Component: HostDashboard },
        { path: "reservations", Component: Reservations },
        { path: "calendar", Component: HostCalendar },
        { path: "editor/:id/bedroom", Component: BedroomEditor },
        { path: "editor/:id/bathroom", Component: BathroomEditor },
        { path: "editor/:id", Component: ListingEditor },
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



