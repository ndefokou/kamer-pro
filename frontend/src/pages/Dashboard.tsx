import { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Heart, Star, Home as HomeIcon, Globe, Menu, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, Product } from "@/api/client";
import MbokoSearch from "@/components/Search";
import { getImageUrl } from "@/lib/utils";
import OptimizedImage from "@/components/OptimizedImage";
import SEO from "@/components/SEO";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useWishlist } from "@/hooks/useWishlist";
import { networkService } from "@/services/networkService";

import PropertyCard from "@/components/PropertyCard";

// PropertySection component defined outside to prevent re-renders
const PropertySection = ({ title, properties, city }: { title: string; properties: Product[]; city?: string }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const normalizeCity = (s?: string) => (s || "").trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    if (!properties || properties.length === 0) return null;

    const isOther = !!city && normalizeCity(city) === 'other';

    return (
        <div className="mb-4 group relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{city && !isOther ? t('StaysIn', { city }) : title}</h2>
                {city && (
                    <button
                        className="text-sm font-semibold hover:underline flex items-center gap-1"
                        onClick={() => navigate(`/marketplace?search=${encodeURIComponent(isOther ? 'other' : city)}`)}
                        aria-label={isOther ? t('otherLocations') : `See all stays in ${city}`}
                    >
                        {t('seeAll')} <span aria-hidden>›</span>
                    </button>
                )}
            </div>

            <div className="relative">
                {/* Left Arrow */}
                {showLeftArrow && (
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center hover:scale-105 transition-transform"
                        aria-label="Previous"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentcolor', strokeWidth: 5.33333, overflow: 'visible' }}><path fill="none" d="M20 28 8.7 16.7a1 1 0 0 1 0-1.4L20 4"></path></svg>
                    </button>
                )}

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex gap-4 md:gap-6 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                >
                    {properties.filter(Boolean).map((product, index) => (
                        <div key={product.listing.id} className="flex-shrink-0 w-[180px] sm:w-[240px] md:w-[280px]">
                            <PropertyCard
                                id={product.listing.id}
                                name={product.listing.title}
                                location={product.listing.city}
                                price={product.listing.price_per_night || 0}
                                images={product.photos?.map(p => ({ image_url: p.url })) || []}
                                isGuestFavorite={false} // Add logic if available
                            />
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                {showRightArrow && (
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center hover:scale-105 transition-transform"
                        aria-label="Next"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentcolor', strokeWidth: 5.33333, overflow: 'visible' }}><path fill="none" d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28"></path></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    // Removed useWishlist hook since PropertyCard handles it internally

    const { data: properties, isLoading, error } = useQuery<Product[]>({
        queryKey: ["products"],
        queryFn: () => getProducts({ limit: networkService.getRecommendedPageSize() + 10 }),
    });

    const normalizeCity = (s?: string) => (s || "").trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const preferredOrder = useMemo(() => ["yaounde", "douala", "kribi"], []);
    const knownCities = useMemo(() => ({
        yaounde: { display: 'Yaounde', lat: 3.8480, lon: 11.5021, synonyms: ['bastos', 'biyem', 'nkolbisson', 'melen', 'odza', 'nkolmesseng', 'nkoabang', 'ekounou', 'essos', 'madagascar'] },
        douala: { display: 'Douala', lat: 4.0511, lon: 9.7679, synonyms: ['akwa', 'bonapriso', 'bonanjo', 'deido', 'makepe', 'ndogbong', 'logbaba', 'bepanda', 'bonamoussadi'] },
        kribi: { display: 'Kribi', lat: 2.9400, lon: 9.9100, synonyms: ['mpalla', 'londji', 'ebambe', 'lolabe'] },
        buea: { display: 'Buea', lat: 4.1527, lon: 9.2410, synonyms: ['molyko', 'muea', 'mile 17', 'bongo square', 'great soppo', 'small soppo', 'bokwango'] },
    }) as const, []);

    const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRad = (d: number) => d * Math.PI / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const inferCity = useCallback((p: Product): string => {
        if (!p?.listing) return '';
        const text = [p.listing.city, p.listing.address, p.listing.title].filter(Boolean).join(' ');
        const norm = normalizeCity(text);
        if (norm) {
            for (const key of preferredOrder) {
                if (norm.includes(key)) return knownCities[key as keyof typeof knownCities].display;
                const syns = knownCities[key as keyof typeof knownCities].synonyms;
                if (syns.some(s => norm.includes(s))) return knownCities[key as keyof typeof knownCities].display;
            }
            // Check other known cities (e.g., Buea)
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
    }, [preferredOrder, knownCities]);

    const { grouped, other, buea } = useMemo(() => {
        const map = new Map<string, { name: string; items: Product[] }>();
        const otherItemsNoKey: Product[] = [];
        (properties || []).forEach((p) => {
            if (!p?.listing) return;
            let raw = (p.listing.city || '').trim();
            if (!raw) raw = inferCity(p);
            const key = normalizeCity(raw);
            if (!key) {
                otherItemsNoKey.push(p);
                return;
            }
            const entry = map.get(key) || { name: raw, items: [] };
            // Prefer the first seen non-empty cased name as display
            if (!entry.name && raw) entry.name = raw;
            entry.items.push(p);
            map.set(key, entry);
        });
        const groups = Array.from(map.values()).sort((a, b) => {
            const ia = preferredOrder.indexOf(normalizeCity(a.name));
            const ib = preferredOrder.indexOf(normalizeCity(b.name));
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return b.items.length - a.items.length;
        });
        const bueaItems = groups.find(g => normalizeCity(g.name) === 'buea')?.items ?? [];
        const nonPreferred = groups
            .filter(g => !preferredOrder.includes(normalizeCity(g.name)) && normalizeCity(g.name) !== 'buea')
            .flatMap(g => g.items);
        return { grouped: groups, other: [...nonPreferred, ...otherItemsNoKey], buea: bueaItems };
    }, [properties, preferredOrder, inferCity]);

    // toggleFavorite and handleLogout removed as they are handled elsewhere or not used in rendering

    return (
        <div className="min-h-screen bg-white pb-20 md:pb-0">
            <SEO
                title={t("Explore")}
                description={t("dashboard.seo.description")}
            />
            {/* Header */}
            <Header />

            {/* Search Bar */}
            <div className="border-b border-gray-200 bg-white">
                <div className="container mx-auto px-4 sm:px-6 py-6">
                    <MbokoSearch />
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 pt-8 pb-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <HomeIcon className="h-4 w-4 text-primary/50" />
                            </div>
                        </div>
                        <p className="text-muted-foreground animate-pulse">{t("Loading best offers...")}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500">{t("Failed to load properties.")}</p>
                    </div>
                ) : (
                    <>
                        {grouped
                            .filter((g) => preferredOrder.includes(normalizeCity(g.name)))
                            .sort((a, b) => preferredOrder.indexOf(normalizeCity(a.name)) - preferredOrder.indexOf(normalizeCity(b.name)))
                            .map((g) => (
                                <PropertySection
                                    key={g.name || Math.random()}
                                    title={t('StaysIn', { city: g.name })}
                                    properties={g.items}
                                    city={g.name}
                                />
                            ))}
                        {buea.length > 0 && (
                            <PropertySection
                                key="buea-section"
                                title={t('StaysIn', { city: 'Buea' })}
                                properties={buea}
                                city="Buea"
                            />
                        )}
                        {other.length > 0 && (
                            <PropertySection
                                key="other-locations"
                                title={t('otherLocations')}
                                properties={other}
                                city="other"
                            />
                        )}
                    </>
                )}
            </main>

            {/* Footer */}
            <Footer />

            <MobileNav />
        </div>
    );
};

export default Dashboard;
