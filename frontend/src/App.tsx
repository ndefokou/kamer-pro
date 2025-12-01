import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { HostProvider } from "@/contexts/HostContext";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Intro from "./pages/host/Intro";
import Amenities from "./pages/host/Amenities";
import Description from "./pages/host/Description";
import TitlePage from "./pages/host/TitlePage";
import PhotoUpload from "./pages/host/PhotoUpload";
import Pricing from "./pages/host/Pricing";
import SafetyDetails from "./pages/host/SafetyDetails";
import BookingSettings from "./pages/host/BookingSettings";
import Preview from "./pages/host/Preview";
import HostDashboard from "./pages/host/HostDashboard";
import HostToday from "./pages/host/HostToday";
import HostCalendar from "./pages/host/HostCalendar";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/", Component: Dashboard },
    { path: "/host/intro", Component: Intro },
    { path: "/host/amenities", Component: Amenities },
    { path: "/host/description", Component: Description },
    { path: "/host/title", Component: TitlePage },
    { path: "/host/photos", Component: PhotoUpload },
    { path: "/host/pricing", Component: Pricing },
    { path: "/host/safety", Component: SafetyDetails },
    { path: "/host/booking-settings", Component: BookingSettings },
    { path: "/host/preview", Component: Preview },
    { path: "/host/dashboard", Component: HostDashboard },
    { path: "/host/today", Component: HostToday },
    { path: "/host/calendar", Component: HostCalendar },
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
  </QueryClientProvider>
);

export default App;



