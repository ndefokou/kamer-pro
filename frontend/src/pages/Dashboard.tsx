import { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Heart, Star, Home as HomeIcon, Globe, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, Product } from "@/api/client";
import MbokoSearch from "@/components/Search";
import { getImageUrl } from "@/lib/utils";
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
import { useWishlist } from "@/hooks/useWishlist";

const Dashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { addToWishlist, removeFromWishlistByProduct, isInWishlist } = useWishlist();

    const { data: properties, isLoading, error } = useQuery<Product[]>({
        queryKey: ["products"],
        queryFn: () => getProducts({}),
    });

    const normalizeCity = (s?: string) => (s || "").trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const preferredOrder = useMemo(() => ["yaounde", "douala", "kribi"], []);
    const knownCities = useMemo(() => ({
        yaounde: { display: 'Yaounde', lat: 3.8480, lon: 11.5021, synonyms: ['bastos','biyem','nkolbisson','melen','odza','nkolmesseng','nkoabang','ekounou','essos','madagascar'] },
        douala: { display: 'Douala', lat: 4.0511, lon: 9.7679, synonyms: ['akwa','bonapriso','bonanjo','deido','makepe','ndogbong','logbaba','bepanda','bonamoussadi'] },
        kribi:   { display: 'Kribi',   lat: 2.9400, lon: 9.9100, synonyms: ['mpalla','londji','ebambe','lolabe'] },
        buea:    { display: 'Buea',    lat: 4.1527, lon: 9.2410, synonyms: ['molyko','muea','mile 17','bongo square','great soppo','small soppo','bokwango'] },
    }) as const, []);

    const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRad = (d: number) => d * Math.PI / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const inferCity = useCallback((p: Product): string => {
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



    const PropertyCard = ({ product, index }: { product: Product; index: number }) => (
        <div className="flex-shrink-0 w-[180px] sm:w-[240px] md:w-[280px] cursor-pointer group">
            <div className="relative aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden mb-2">
                <img
                    src={getImageUrl(product.photos[0]?.url) || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=400&fit=crop"}
                    alt={product.listing.title || "Property image"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onClick={() => navigate(`/product/${product.listing.id}`)}
                />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.listing.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full hover:scale-110 transition-transform"
                >
                    <Heart
                        className={`h-6 w-6 ${isInWishlist(product.listing.id)
                            ? 'fill-[#FF385C] text-[#FF385C]'
                            : 'fill-black/50 text-white stroke-white stroke-2'
                            }`}
                    />
                </button>
                <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-full text-xs font-semibold">
                    Guest favorite
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 truncate flex-1 text-[13px] sm:text-sm">{product.listing.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-700">
                    {(product.listing.property_type || 'Appartement')} · {product.listing.city}
                </p>
                <div className="flex items-baseline gap-1 pt-0.5">
                    <span className="font-semibold text-gray-900 text-[13px] sm:text-[15px]">{product.listing.price_per_night?.toLocaleString()} FCFA</span>
                    <span className="text-xs sm:text-sm text-gray-600">par nuit</span>
                </div>
            </div>
        </div>
    );

    const PropertySection = ({ title, properties, city }: { title: string; properties: Product[]; city?: string }) => {
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

        if (!properties || properties.length === 0) return null;

        const isOther = !!city && normalizeCity(city) === 'other';

        return (
            <div className="mb-12 group relative">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{city && !isOther ? t('popularStaysIn', { city }) : title}</h2>
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
                            <PropertyCard key={product.listing.id} product={product} index={index} />
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

    return (
        <div className="min-h-screen bg-white pb-20 md:pb-0">
            {/* Header */}
            <Header />

            {/* Search Bar */}
            <div className="border-b border-gray-200 bg-white">
                <div className="container mx-auto px-4 sm:px-6 py-6">
                    <MbokoSearch />
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 py-8">
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
                                    title={`Logements populaires · ${g.name}`}
                                    properties={g.items}
                                    city={g.name}
                                />
                            ))}
                        {buea.length > 0 && (
                            <PropertySection
                                key="buea-section"
                                title={t('popularStaysIn', { city: 'Buea' })}
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

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe transition-all duration-300">
                <div className="max-w-md mx-auto px-6">
                    <ul className="grid grid-cols-5 h-16">
                        <li className="flex items-center justify-center">
                            <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <HomeIcon className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-600 group-hover:text-primary transition-colors">{t("Explore")}</span>
                            </button>
                        </li>
                        <li className="flex items-center justify-center">
                            <button onClick={() => navigate('/wishlist')} className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Heart className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-600 group-hover:text-primary transition-colors">{t("Favorites")}</span>
                            </button>
                        </li>
                        <li className="flex items-center justify-center">
                            <button onClick={() => navigate('/bookings')} className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <svg className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </div>
                                <span className="text-[10px] font-medium text-gray-600 group-hover:text-primary transition-colors">{t("Reservations")}</span>
                            </button>
                        </li>
                        <li className="flex items-center justify-center">
                            <button onClick={() => navigate('/messages')} className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <svg className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </div>
                                <span className="text-[10px] font-medium text-gray-600 group-hover:text-primary transition-colors">{t("Messages")}</span>
                            </button>
                        </li>
                        <li className="flex items-center justify-center">
                            <button onClick={() => navigate('/account')} className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <User className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-600 group-hover:text-primary transition-colors">{t("Profile")}</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
    );
};

export default Dashboard;
