import { useQuery } from "@tanstack/react-query";
import { getProducts, Product, getTowns, TownCount } from "@/api/client";
import PropertyCard from "@/components/PropertyCard";
import MbokoSearch from "@/components/Search";
import HorizontalPropertySection from "@/components/HorizontalPropertySection";
import { getImageUrl } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const {
    data: products,
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => getProducts({}),
  });

  const { data: towns } = useQuery<TownCount[]>({
    queryKey: ["towns"],
    queryFn: getTowns,
  });

  const navigate = useNavigate();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading products</div>;
  }

  const popularListings = products?.slice(0, 5) || [];
  const nextMonthListings = products?.slice(5, 10) || [];
  const nearbyListings = products?.slice(10, 15) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <MbokoSearch />

        {towns && towns.length > 0 && (
          <HorizontalPropertySection title="Browse by town">
            {towns.map((t) => (
              <button
                key={t.city}
                onClick={() => navigate(`/marketplace?search=${encodeURIComponent(t.city)}`)}
                className="min-w-[160px] md:min-w-[200px] h-[100px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="text-base md:text-lg font-semibold text-gray-900">{t.city}</div>
                <div className="text-sm text-gray-600">{t.count} stays</div>
              </button>
            ))}
          </HorizontalPropertySection>
        )}

        <HorizontalPropertySection title="Popular stays">
          {popularListings.map((product) => (
            <div key={product.listing.id} className="w-[200px] sm:w-[280px]">
              <PropertyCard
                id={product.listing.id}
                name={product.listing.title ?? "Untitled"}
                location={product.listing.city ?? "Unknown"}
                price={product.listing.price_per_night ?? 0}
                images={product.photos.map((photo) => ({ image_url: photo.url }))}
              />
            </div>
          ))}
        </HorizontalPropertySection>
        <HorizontalPropertySection title="Available next month">
          {nextMonthListings.map((product) => (
            <div key={product.listing.id} className="w-[200px] sm:w-[280px]">
              <PropertyCard
                id={product.listing.id}
                name={product.listing.title ?? "Untitled"}
                location={product.listing.city ?? "Unknown"}
                price={product.listing.price_per_night ?? 0}
                images={product.photos.map((photo) => ({ image_url: photo.url }))}
              />
            </div>
          ))}
        </HorizontalPropertySection>
        <HorizontalPropertySection title="Nearby stays">
          {nearbyListings.map((product) => (
            <div key={product.listing.id} className="w-[200px] sm:w-[280px]">
              <PropertyCard
                id={product.listing.id}
                name={product.listing.title ?? "Untitled"}
                location={product.listing.city ?? "Unknown"}
                price={product.listing.price_per_night ?? 0}
                images={product.photos.map((photo) => ({ image_url: photo.url }))}
              />
            </div>
          ))}
        </HorizontalPropertySection>

        {/* All Listings */}
        <section className="py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {products?.map((product) => (
              <PropertyCard
                key={product.listing.id}
                id={product.listing.id}
                name={product.listing.title ?? "Untitled"}
                location={product.listing.city ?? "Unknown"}
                price={product.listing.price_per_night ?? 0}
                images={product.photos.map((photo) => ({ image_url: photo.url }))}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
