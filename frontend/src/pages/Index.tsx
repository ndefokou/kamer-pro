import { useQuery } from "@tanstack/react-query";
import { getProducts, Product } from "@/api/client";
import PropertyCard from "@/components/PropertyCard";
import AirbnbSearch from "@/components/Search";
import HorizontalPropertySection from "@/components/HorizontalPropertySection";
import { getImageUrl } from "@/lib/utils";

const Index = () => {
  const {
    data: products,
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => getProducts({}),
  });

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
        <AirbnbSearch />

        <HorizontalPropertySection title="Logements populaires">
          {popularListings.map((product) => (
            <PropertyCard
              key={product.listing.id}
              id={product.listing.id}
              name={product.listing.title ?? "Untitled"}
              location={product.listing.city ?? "Unknown"}
              price={product.listing.price_per_night ?? 0}
              images={product.photos.map((photo) => ({ image_url: photo.url }))}
            />
          ))}
        </HorizontalPropertySection>
        <HorizontalPropertySection title="Logements disponibles le mois prochain">
          {nextMonthListings.map((product) => (
            <PropertyCard
              key={product.listing.id}
              id={product.listing.id}
              name={product.listing.title ?? "Untitled"}
              location={product.listing.city ?? "Unknown"}
              price={product.listing.price_per_night ?? 0}
              images={product.photos.map((photo) => ({ image_url: photo.url }))}
            />
          ))}
        </HorizontalPropertySection>
        <HorizontalPropertySection title="Logements à proximité">
          {nearbyListings.map((product) => (
            <PropertyCard
              key={product.listing.id}
              id={product.listing.id}
              name={product.listing.title ?? "Untitled"}
              location={product.listing.city ?? "Unknown"}
              price={product.listing.price_per_night ?? 0}
              images={product.photos.map((photo) => ({ image_url: photo.url }))}
            />
          ))}
        </HorizontalPropertySection>

        {/* All Listings */}
        <section className="py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
