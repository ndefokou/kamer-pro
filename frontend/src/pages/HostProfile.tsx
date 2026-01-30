import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getHostListings, getUserById, type Product } from "@/api/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SEO from "@/components/SEO";

const HostProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hostId = Number(id);

  const userQuery = useQuery({
    queryKey: ["host-profile", hostId],
    queryFn: () => getUserById(hostId),
    enabled: !Number.isNaN(hostId),
  });

  const listingsQuery = useQuery<Product[]>({
    queryKey: ["host-listings", hostId],
    queryFn: () => getHostListings(hostId),
    enabled: !Number.isNaN(hostId),
  });

  const hostName = useMemo(() => {
    const profile = userQuery.data?.profile;
    const user = userQuery.data?.user;
    return (
      (profile?.preferred_first_name && profile.preferred_first_name.trim()) ||
      (profile?.legal_name && profile.legal_name.trim()) ||
      (user?.username || "").trim() ||
      "Host"
    );
  }, [userQuery.data]);

  const avatar = userQuery.data?.profile?.avatar;

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={`${hostName}'s Profile`}
        description={`View ${listingsQuery.data?.length || 0} listings from ${hostName} on Le Mboko. Connect and book directly.`}
        image={avatar || undefined}
      />
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-8">
        <button className="text-sm text-gray-600 mb-6 hover:underline" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatar || undefined} alt={hostName} />
            <AvatarFallback>{hostName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{hostName}</h1>
            <p className="text-sm text-gray-600">
              {listingsQuery.data?.length || 0} published listing{(listingsQuery.data?.length || 0) === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {(listingsQuery.data || []).map((p) => (
            <PropertyCard
              key={p.listing.id}
              id={p.listing.id}
              name={p.listing.title ?? "Untitled"}
              location={p.listing.city || "Unknown"}
              price={p.listing.price_per_night ?? 0}
              images={p.photos.map((photo) => ({ image_url: photo.url }))}
            />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HostProfile;
