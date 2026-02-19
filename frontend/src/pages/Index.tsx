import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getProducts, Product, getTowns, TownCount } from "@/api/client";
import PropertyCard from "@/components/PropertyCard";
import MbokoSearch from "@/components/Search";
import HorizontalPropertySection from "@/components/HorizontalPropertySection";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { normalizeCity, inferCity, preferredOrder, knownCities } from "@/lib/cityUtils";

const Index = () => {
  const { t } = useTranslation();
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<Product[], Error>({
    queryKey: ["products"],
    initialPageParam: 0,
    // Use a reasonable limit for better performance
    queryFn: ({ pageParam }) => getProducts({ limit: 40, offset: (pageParam as number) || 0 }, 'high'),
    getNextPageParam: (lastPage, allPages) => (lastPage.length === 40 ? allPages.length * 40 : undefined),
  });

  // Background auto-loading: fetch next pages during idle time to avoid network pressure
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const scheduleLoad = () => {
      // Small cooldown to ensure UI is stable
      const timer = setTimeout(() => {
        if ('requestIdleCallback' in window) {
          (window as unknown as { requestIdleCallback: (callback: () => void, options?: { timeout: number }) => void }).requestIdleCallback(() => {
            fetchNextPage();
          }, { timeout: 10000 });
        } else {
          // Fallback for browsers without requestIdleCallback
          fetchNextPage();
        }
      }, 5000);

      return () => clearTimeout(timer);
    };

    return scheduleLoad();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data?.pages?.length]);

  const { data: towns } = useQuery<TownCount[]>({
    queryKey: ["towns"],
    queryFn: getTowns,
    // Delay towns fetch slightly to prioritize listings
    staleTime: 3600000,
  });

  const navigate = useNavigate();

  const allProducts = useMemo(() => {
    if (!data?.pages) return [];
    try {
      return data.pages.flat().filter(Boolean) || [];
    } catch (e) {
      console.error("Index: Error flattening properties:", e);
      return [];
    }
  }, [data?.pages]);

  const groupedByCity = useMemo(() => {
    const map = new Map<string, { name: string; items: Product[] }>();
    if (!Array.isArray(allProducts)) return [];
    for (const p of allProducts) {
      if (!p?.listing) continue;

      // Try to determine canonical city name first
      let displayName = inferCity(p);

      // Fallback to raw listing city or "Unknown" if not found
      if (!displayName) {
        displayName = (p.listing.city || '').trim();
      }
      if (!displayName) displayName = "Unknown";

      const key = normalizeCity(displayName);
      if (!key) continue;

      const entry = map.get(key) || { name: displayName, items: [] };
      // Prefer the canonical display name if we have one
      if (knownCities[key as keyof typeof knownCities]) {
        entry.name = knownCities[key as keyof typeof knownCities].display;
      } else if (!entry.name) {
        entry.name = displayName;
      }

      entry.items.push(p);
      map.set(key, entry);
    }

    // Sort: Yaounde, Douala, Kribi, then by item count desc
    const ordered = Array.from(map.values()).sort((a, b) => {
      const ia = preferredOrder.indexOf(normalizeCity(a.name));
      const ib = preferredOrder.indexOf(normalizeCity(b.name));
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b.items.length - a.items.length;
    });

    return ordered.map(g => [g.name, g.items] as [string, Product[]]);
  }, [allProducts]);

  if (error) {
    return <div>Error loading products</div>;
  }

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

        {groupedByCity.map(([city, items]) => (
          <section key={city} className="py-10">
            <h2 className="text-2xl font-bold mb-6">{`${t('Stays in')} ${city}`}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {items.map((product) => (
                <PropertyCard
                  key={product.listing.id}
                  id={product.listing.id}
                  name={product.listing.title ?? "Untitled"}
                  location={product.listing.city || inferCity(product) || "Unknown"}
                  price={product.listing.price_per_night ?? 0}
                  images={product.photos.map((photo) => ({ image_url: photo.url }))}
                  propertyType={product.listing.property_type}
                />
              ))}
            </div>
          </section>
        ))}

      </div>

      {hasNextPage && (
        <div className="flex justify-center pb-12 mt-8">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            className="min-w-[200px]"
          >
            {isFetchingNextPage ? t('common.loading', 'Loading...') : t('common.loadMore', 'Load More')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Index;
