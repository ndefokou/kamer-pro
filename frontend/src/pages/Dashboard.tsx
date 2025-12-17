import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Heart, Star, Home as HomeIcon, Globe, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, Product } from "@/api/client";
import MboaMaissonSearch from "@/components/Search";
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

const Dashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    const { data: properties, isLoading, error } = useQuery<Product[]>({
        queryKey: ["products"],
        queryFn: () => getProducts({}),
    });

    const doualaProperties = properties?.filter(p => p.listing.city?.toLowerCase() === 'douala') || [];
    const yaoundeProperties = properties?.filter(p => p.listing.city?.toLowerCase() === 'yaoundé' || p.listing.city?.toLowerCase() === 'yaounde') || [];
    const kribiProperties = properties?.filter(p => p.listing.city?.toLowerCase() === 'kribi') || [];

    const toggleFavorite = (id: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(id)) {
                newFavorites.delete(id);
            } else {
                newFavorites.add(id);
            }
            return newFavorites;
        });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };



    const PropertyCard = ({ product, index }: { product: Product; index: number }) => (
        <div className="flex-shrink-0 w-[280px] cursor-pointer group">
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
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
                        className={`h-6 w-6 ${favorites.has(product.listing.id)
                            ? 'fill-[#FF385C] text-[#FF385C]'
                            : 'fill-black/50 text-white stroke-white stroke-2'
                            }`}
                    />
                </button>
                {index % 3 === 0 && (
                    <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-full text-xs font-semibold">
                        Coup de cœur voyageurs
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 truncate flex-1">{product.listing.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{product.listing.city}</p>
                <p className="text-sm text-gray-600">
                    16-25 dec.
                </p>
                <div className="flex items-baseline gap-1 pt-1">
                    <span className="font-semibold text-gray-900">{product.listing.price_per_night?.toLocaleString()} FCFA</span>
                    <span className="text-sm text-gray-600">par nuit</span>
                </div>
            </div>
        </div>
    );

    const PropertySection = ({ title, properties }: { title: string; properties: Product[] }) => {
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

        return (
            <div className="mb-12 group relative">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">{title}</h2>

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
                        className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
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
                    <MboaMaissonSearch />
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
                        <p className="text-muted-foreground animate-pulse">{t("Chargement des meilleures offres...")}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500">{t("Failed to load properties.")}</p>
                    </div>
                ) : (
                    <>
                        <PropertySection
                            title={t("Logements à Douala")}
                            properties={doualaProperties}
                        />
                        <PropertySection
                            title={t("Logements à Yaoundé")}
                            properties={yaoundeProperties}
                        />
                        <PropertySection
                            title={t("Logements à Kribi")}
                            properties={kribiProperties}
                        />
                    </>
                )}
            </main>

            {/* Footer */}
            <Footer />

            {/* Mobile Bottom Nav */}
            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe transition-all duration-300">
                <div className="max-w-md mx-auto px-6">
                    <ul className="grid grid-cols-3 h-16">
                        <li className="flex items-center justify-center">
                            <a href="/webauth-login?tab=register" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <HomeIcon className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-primary transition-colors">{t("Devenir hôte")}</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <button className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Globe className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-primary transition-colors">{t("Langue")}</span>
                            </button>
                        </li>
                        <li className="flex items-center justify-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex flex-col items-center gap-1 group w-full h-full justify-center outline-none">
                                        <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                            <User className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-500 group-hover:text-primary transition-colors">{user ? t("Profil") : t("Connexion")}</span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" side="top" className="w-56 mb-2 p-2 rounded-xl shadow-elevated border-border/50 bg-white/95 backdrop-blur-sm">
                                    <DropdownMenuItem onClick={() => navigate('/account')} className="rounded-lg cursor-pointer py-2.5">
                                        <User className="mr-2 h-4 w-4" />
                                        {t("Compte")}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50">
                                        {t("Déconnexion")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
    );
};

export default Dashboard;
