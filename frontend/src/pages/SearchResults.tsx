import { Suspense, lazy, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Home as HomeIcon, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, Product, getTowns, TownCount } from "@/api/client";
import { getImageUrl, formatPrice } from "@/lib/utils";
import OptimizedImage from "@/components/OptimizedImage";
import { useTranslation } from "react-i18next";
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import Header from "@/components/Header";
import HorizontalPropertySection from "@/components/HorizontalPropertySection";
import PropertyCard from "@/components/PropertyCard";
import NearbyPOI from "@/components/NearbyPOI";
import SEO from "@/components/SEO";

// Fix Leaflet default icon issue
const SearchMap = lazy(() => import("@/components/Map/SearchMap"));

const normalizeCity = (s?: string) => (s || "").trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const preferredOrder = ["yaounde", "douala", "kribi"];
const knownCities = {
    yaounde: { display: 'Yaounde', lat: 3.8480, lon: 11.5021, synonyms: ['bastos', 'biyem', 'nkolbisson', 'melen', 'odza', 'nkolmesseng', 'nkoabang', 'ekounou', 'essos', 'madagascar'] },
    douala: { display: 'Douala', lat: 4.0511, lon: 9.7679, synonyms: ['akwa', 'bonapriso', 'bonanjo', 'deido', 'makepe', 'ndogbong', 'logbaba', 'bepanda', 'bonamoussadi'] },
    kribi: { display: 'Kribi', lat: 2.9400, lon: 9.9100, synonyms: ['mpalla', 'londji', 'ebambe', 'lolabe'] },
    buea: { display: 'Buea', lat: 4.1527, lon: 9.2410, synonyms: ['molyko', 'muea', 'mile 17', 'bongo square', 'great soppo', 'small soppo', 'bokwango', 'limbe', 'tiko', 'kumba'] },
    bamenda: { display: 'Bamenda', lat: 5.9631, lon: 10.1591, synonyms: ['mankon', 'bambili', 'nkambé', 'kumbo'] },
    bafoussam: { display: 'Bafoussam', lat: 5.4769, lon: 10.4170, synonyms: ['dschang', 'bandjoun', 'foumban'] },
    ngaoundere: { display: 'Ngaoundere', lat: 7.3263, lon: 13.5847, synonyms: ['adamawa', 'tibati', 'meiganga'] },
    garoua: { display: 'Garoua', lat: 9.3000, lon: 13.4000, synonyms: [] },
    maroua: { display: 'Maroua', lat: 10.5956, lon: 14.3247, synonyms: ['far north'] },
    bertoua: { display: 'Bertoua', lat: 4.5833, lon: 13.6833, synonyms: [] },
    ebolowa: { display: 'Ebolowa', lat: 2.9000, lon: 11.1500, synonyms: ['south'] },
} as const;

const regions = {
    'centre': ['yaounde'],
    'littoral': ['douala', 'nkongsamba', 'edea'],
    'south': ['kribi', 'ebolowa'],
    'southwest': ['buea', 'limbe', 'tiko', 'kumba'],
    'northwest': ['bamenda', 'kumbo', 'ndop'],
    'west': ['bafoussam', 'dschang', 'bandjoun'],
    'adamawa': ['ngaoundere', 'tibati', 'meiganga'],
    'north': ['garoua'],
    'far north': ['maroua', 'kousseri'],
    'east': ['bertoua', 'batouri'],
} as const;

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => d * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const inferCity = (p: Product): string => {
    const text = [p.listing.city, p.listing.address, p.listing.title].filter(Boolean).join(' ');
    const norm = normalizeCity(text);
    if (norm) {
        for (const key of preferredOrder) {
            if (norm.includes(key)) return knownCities[key as keyof typeof knownCities].display;
            const syns = knownCities[key as keyof typeof knownCities].synonyms;
            if (syns.some(s => norm.includes(s))) return knownCities[key as keyof typeof knownCities].display;
        }
        for (const key of (Object.keys(knownCities) as Array<keyof typeof knownCities>)) {
            if ((preferredOrder as readonly string[]).includes(key as string)) continue;
            if (norm.includes(key)) return knownCities[key].display;
            const syns = knownCities[key].synonyms;
            if (syns.some(s => norm.includes(s))) return knownCities[key].display;
        }
    }
    if (p.listing.latitude && p.listing.longitude) {
        const { latitude, longitude } = p.listing;
        let best: { key: keyof typeof knownCities; dist: number } | null = null;
        (Object.keys(knownCities) as Array<keyof typeof knownCities>).forEach((key) => {
            const city = knownCities[key];
            const d = distanceKm(latitude!, longitude!, city.lat, city.lon);
            if (!best || d < best.dist) best = { key, dist: d };
        });
        if (best && best.dist <= 80) {
            return knownCities[best.key].display;
        }
    }
    return '';
};

const SearchResults = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, logout } = useAuth();
    const { addToWishlist, removeFromWishlistByProduct, isInWishlist } = useWishlist();

    // Get search params
    const location = searchParams.get("search") || "";
    const checkin = searchParams.get("checkin");
    const checkout = searchParams.get("checkout");
    const guests = parseInt(searchParams.get("guests") || "0");

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery<Product[], Error>({
        queryKey: ["products", location, guests],
        initialPageParam: 0,
        staleTime: 120000,
        gcTime: 600000,
        placeholderData: (prev) => prev, // keepPreviousData behavior
        retry: 2,
        queryFn: ({ pageParam }) => {
            const isManaged = (Object.keys(knownCities) as Array<keyof typeof knownCities>).includes(normalizeCity(location) as any) ||
                (Object.keys(regions) as Array<keyof typeof regions>).includes(normalizeCity(location) as any) ||
                normalizeCity(location) === 'other' ||
                normalizeCity(location) === 'buea';

            return getProducts({
                search: (location && !isManaged) ? location : undefined,
                guests: guests > 0 ? guests : undefined,
                limit: 20,
                offset: (pageParam as number) || 0,
            });
        },
        getNextPageParam: (lastPage, allPages) => {
            const limit = 20;
            return lastPage.length === limit ? allPages.length * limit : undefined;
        },
    });

    const { data: towns } = useQuery<TownCount[]>({
        queryKey: ["towns"],
        queryFn: getTowns,
    });


    const filteredProperties = useMemo(() => {
        const properties = ((data?.pages?.flat() as Product[]) || []);
        const locNorm = normalizeCity(location);
        return properties.filter((p) => {
            // Filter by location (accent-insensitive + inference)
            if (locNorm) {
                if (!p?.listing) return false;
                if (locNorm === 'other') {
                    const inferredKey = normalizeCity(inferCity(p));
                    const explicitKey = normalizeCity(p.listing.city || "");
                    const key = inferredKey || explicitKey;
                    if (key && (preferredOrder.includes(key) || key === 'buea')) {
                        return false;
                    }
                } else if ((Object.keys(regions) as Array<keyof typeof regions>).includes(locNorm as keyof typeof regions)) {
                    const allowed = regions[locNorm as keyof typeof regions].map((c) => normalizeCity(c));
                    const cityNorm = normalizeCity(p.listing.city || "");
                    const inferredNorm = normalizeCity(inferCity(p));
                    const key = cityNorm || inferredNorm;
                    if (!key || !allowed.includes(key)) return false;
                } else if (locNorm === 'buea') {
                    // Specific check for Buea to match Dashboard behavior
                    const inferredNorm = normalizeCity(inferCity(p));
                    const cityNorm = normalizeCity(p.listing.city || "");
                    if (inferredNorm !== 'buea' && cityNorm !== 'buea') return false;
                } else {
                    const cityNorm = normalizeCity(p.listing.city || "");
                    const addrNorm = normalizeCity(p.listing.address || "");
                    const titleNorm = normalizeCity(p.listing.title || "");
                    const inferredNorm = normalizeCity(inferCity(p));
                    const matches =
                        cityNorm.includes(locNorm) ||
                        addrNorm.includes(locNorm) ||
                        titleNorm.includes(locNorm) ||
                        inferredNorm === locNorm;
                    if (!matches) return false;
                }
            }

            // Filter by guests
            if (guests > 0 && (p.listing.max_guests || 0) < guests) {
                return false;
            }

            // Date filtering would go here if we had availability data in the product list
            // For now, we assume available

            return true;
        });
    }, [data?.pages, location, guests, inferCity, preferredOrder, regions]);

    const groupedByCity = useMemo(() => {
        const map = new Map<string, { name: string; items: Product[] }>();
        for (const p of filteredProperties) {
            if (!p?.listing) continue;
            let name = (p.listing.city || '').trim();
            if (!name) name = inferCity(p);

            const locNorm = normalizeCity(location);
            const key = normalizeCity(name);

            // If we are searching for a specific known city and this listing matched it,
            // ensure it's grouped under that city even if its own city field is empty/unclear.
            let finalKey = key;
            let displayName = name;

            if (!key && locNorm && locNorm !== 'other') {
                finalKey = locNorm;
                // Find display name from knownCities or regions
                displayName = knownCities[locNorm as keyof typeof knownCities]?.display || location;
            }

            if (!finalKey) continue;
            const entry = map.get(finalKey) || { name: displayName, items: [] };
            if (!entry.name && displayName) entry.name = displayName;
            entry.items.push(p);
            map.set(finalKey, entry);
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
    }, [filteredProperties, preferredOrder, inferCity]);

    const mapPoints = useMemo(() => {
        const raw: { id: string; lat: number; lon: number; product: Product }[] = [];
        for (const p of filteredProperties) {
            if (!p?.listing) continue;
            if (typeof p.listing.latitude === 'number' && typeof p.listing.longitude === 'number') {
                raw.push({ id: p.listing.id, lat: p.listing.latitude, lon: p.listing.longitude, product: p });
                continue;
            }
            const inferred = inferCity(p) || p.listing.city || '';
            const key = normalizeCity(inferred);
            const cityKey = (Object.keys(knownCities) as Array<keyof typeof knownCities>).find(k => k === key);
            const city = cityKey ? knownCities[cityKey] : undefined;
            if (city && typeof city.lat === 'number' && typeof city.lon === 'number') {
                raw.push({ id: p.listing.id, lat: city.lat, lon: city.lon, product: p });
            }
        }

        // Spread overlapping markers slightly so they don't sit exactly on top of each other
        const groups = new Map<string, { idxs: number[]; lat: number; lon: number }>();
        raw.forEach((pt, i) => {
            const key = `${pt.lat.toFixed(5)},${pt.lon.toFixed(5)}`;
            const g = groups.get(key);
            if (g) {
                g.idxs.push(i);
            } else {
                groups.set(key, { idxs: [i], lat: pt.lat, lon: pt.lon });
            }
        });

        const spread = [...raw];
        groups.forEach(({ idxs, lat, lon }) => {
            if (idxs.length <= 1) return;
            const radius = 0.0007; // ~70-80m
            const lonAdjust = (d: number) => d / Math.cos((lat * Math.PI) / 180);
            idxs.forEach((idx, order) => {
                const angle = (2 * Math.PI * order) / idxs.length;
                const dLat = radius * Math.cos(angle);
                const dLon = lonAdjust(radius * Math.sin(angle));
                spread[idx] = { ...spread[idx], lat: lat + dLat, lon: lon + dLon };
            });
        });

        return spread;
    }, [filteredProperties, inferCity, knownCities]);

    const fallbackCenter = useMemo(() => {
        const locNorm = normalizeCity(location);
        if (locNorm && knownCities[locNorm as keyof typeof knownCities]) {
            const city = knownCities[locNorm as keyof typeof knownCities];
            return [city.lat, city.lon] as [number, number];
        }
        return null;
    }, [location, knownCities]);



    const singlePoint = useMemo(() => {
        if (mapPoints.length === 1) {
            return [mapPoints[0].lat, mapPoints[0].lon] as [number, number];
        }
        return fallbackCenter;
    }, [mapPoints, fallbackCenter]);

    const toggleFavorite = (id: string) => {
        if (isInWishlist(id)) {
            removeFromWishlistByProduct(id);
        } else {
            addToWishlist(id);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const UserMenuContent = () => (
        <>
            {user ? (
                <>
                    <DropdownMenuItem className="font-semibold" onClick={() => navigate('/host/dashboard')}>
                        {t("Manage my listing")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                        {t("Account")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        {t("Log out")}
                    </DropdownMenuItem>
                </>
            ) : (
                <>
                    <DropdownMenuItem onClick={() => navigate('/login?tab=register&redirect=/host/dashboard')} className="font-semibold">
                        {t("Become a host")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/login')}>
                        {t("Log in or sign up")}
                    </DropdownMenuItem>
                </>
            )}
        </>
    );

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <SEO
                title={location ? `${t("Search")}: ${location}` : t("search.search")}
                description={t("search.browse_available", {
                    count: filteredProperties.length,
                    location: location ? `${t("search.in")} ${location}` : t("search.across_cameroon")
                })}
            />
            {/* Header */}
            <Header />

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Listings List (Left) */}
                <div className="w-full md:w-[60%] lg:w-[55%] xl:w-[50%] overflow-y-auto p-6">
                    <div className="mb-4">
                        <p className="text-sm text-gray-500">
                            {filteredProperties.length === 1
                                ? t("search.stay_count", { count: 1 })
                                : t("search.stays_count", { count: filteredProperties.length })}
                            {location ? ` ${t("search.in")} ${location}` : ""}
                        </p>
                        <h1 className="text-2xl font-bold mt-1">
                            {t("search.stays_in", { location: location || t("search.cameroon") })}
                        </h1>
                    </div>

                    {towns && towns.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-2 px-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                            {towns.map((t) => (
                                <button
                                    key={t.city}
                                    onClick={() => navigate(`/marketplace?search=${encodeURIComponent(t.city)}${guests > 0 ? `&guests=${guests}` : ''}`)}
                                    className={`px-3 py-1.5 rounded-full border text-sm whitespace-nowrap ${t.city.toLowerCase() === location.toLowerCase() ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-200 hover:border-black'}`}
                                >
                                    {t.city} <span className="text-gray-500">({t.count})</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <HomeIcon className="h-4 w-4 text-primary/50" />
                                </div>
                            </div>
                            <p className="text-muted-foreground animate-pulse">{t("search.loading")}</p>
                        </div>
                    ) : filteredProperties.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-600">{t("search.no_results")}</p>
                            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
                                {t("search.clear_filters")}
                            </Button>
                        </div>
                    ) : (
                        groupedByCity.map(([city, items]) => (
                            <HorizontalPropertySection key={city} title={city}>
                                {items.map((product) => (
                                    <div key={product.listing.id} className="w-[200px] sm:w-[280px]">
                                        <PropertyCard
                                            id={product.listing.id}
                                            name={product.listing.title ?? "Untitled"}
                                            location={product.listing.city || inferCity(product) || "Unknown"}
                                            price={product.listing.price_per_night ?? 0}
                                            images={product.photos.map((photo) => ({ image_url: photo.url }))}
                                        />
                                    </div>
                                ))}
                            </HorizontalPropertySection>
                        ))
                    )}

                    <div className="flex justify-center mt-6">
                        {hasNextPage && (
                            <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
                                {isFetchingNextPage ? t("search.loading_more") : t("search.load_more")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Map (Right) */}
                <div className="hidden md:block w-[40%] lg:w-[45%] xl:w-[50%] h-[calc(100vh-80px)] sticky top-20">
                    <Suspense fallback={
                        <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <MapIcon className="h-8 w-8 text-slate-300 animate-pulse" />
                                <span className="text-sm text-slate-400">{t("Loading map...")}</span>
                            </div>
                        </div>
                    }>
                        <SearchMap
                            mapPoints={mapPoints}
                            singlePoint={singlePoint}
                            fallbackCenter={fallbackCenter}
                        />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default SearchResults;

