import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Heart, Star, Home as HomeIcon, Globe, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, Product } from "@/api/client";
import AirbnbSearch from "@/components/AirbnbSearch";
import { getImageUrl } from "@/lib/utils";

const Dashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    const { data: properties, isLoading, error } = useQuery<Product[]>({
        queryKey: ["products"],
        queryFn: () => getProducts({}),
    });

    const featuredProperties = properties?.slice(0, 8) || [];
    const upcomingProperties = properties?.slice(8, 16) || [];
    const nearbyProperties = properties?.slice(16, 24) || [];

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

    const PropertyCard = ({ product, index }: { product: Product; index: number }) => (
        <div className="flex-shrink-0 w-[280px] cursor-pointer group">
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                <img
                    src={getImageUrl(product.photos[0]?.url) || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=400&fit=crop"}
                    alt={product.listing.title || "Property image"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onClick={() => navigate(`/property/${product.listing.id}`)}
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
                    <div className="flex items-center gap-1 ml-2">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">{(4.3 + Math.random() * 0.7).toFixed(2)}</span>
                    </div>
                </div>
                <p className="text-sm text-gray-600">{product.listing.city}</p>
                <p className="text-sm text-gray-600">
                    {Math.floor(Math.random() * 30) + 1}-{Math.floor(Math.random() * 7) + 1} {t("janv")} · {t("1 nuit particulier")}
                </p>
                <div className="flex items-baseline gap-1 pt-1">
                    <span className="font-semibold text-gray-900">{product.listing.price_per_night?.toLocaleString()} FCFA</span>
                    <span className="text-sm text-gray-600">{t("pour 2 nuits")}</span>
                </div>
            </div>
        </div>
    );

    const PropertySection = ({ title, properties }: { title: string; properties: Product[] }) => (
        <div className="mb-12">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                {properties.filter(Boolean).map((product, index) => (
                    <PropertyCard key={product.listing.id} product={product} index={index} />
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-gray-200 sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                            <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <span className="text-xl font-bold text-green-600">MboaMaison</span>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="hidden md:flex items-center gap-8">
                            <button className="flex items-center gap-2 px-4 py-3 rounded-full hover:bg-gray-100 transition-colors">
                                <HomeIcon className="h-5 w-5" />
                                <span className="font-medium">{t("Logements")}</span>
                            </button>
                        </div>

                        {/* Right Menu */}
                        <div className="flex items-center gap-4">
                            <button
                                className="hidden md:block text-sm font-semibold hover:bg-gray-100 px-4 py-3 rounded-full transition-colors"
                                onClick={() => navigate('/webauth-login?tab=register')}
                            >
                                {t("Devenir hôte")}
                            </button>
                            <button className="p-3 hover:bg-gray-100 rounded-full transition-colors">
                                <Globe className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-3 border border-gray-300 rounded-full px-3 py-2 hover:shadow-md transition-shadow cursor-pointer">
                                <Menu className="h-4 w-4" />
                                <div className="bg-gray-700 rounded-full p-1.5">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Search Bar */}
            <div className="border-b border-gray-200 bg-white">
                <div className="container mx-auto px-4 sm:px-6 py-6">
                    <AirbnbSearch />
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4" />
                            <p className="text-gray-600">{t("Chargement...")}</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500">{t("Failed to load properties.")}</p>
                    </div>
                ) : (
                    <>
                        <PropertySection
                            title={t("Logements populaires")}
                            properties={featuredProperties}
                        />
                        <PropertySection
                            title={t("Logements disponibles le mois prochain")}
                            properties={upcomingProperties}
                        />
                        <PropertySection
                            title={t("Logements à proximité")}
                            properties={nearbyProperties}
                        />
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-gray-50 py-12 mt-16">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">{t("Assistance")}</h3>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="hover:underline cursor-pointer">{t("Centre d'aide")}</li>
                                <li className="hover:underline cursor-pointer">{t("AirCover")}</li>
                                <li className="hover:underline cursor-pointer">{t("Sécurité")}</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">{t("Communauté")}</h3>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="hover:underline cursor-pointer">{t("Airbnb.org")}</li>
                                <li className="hover:underline cursor-pointer">{t("Fonctionnalités")}</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">{t("Accueil")}</h3>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="hover:underline cursor-pointer">{t("Essayer l'accueil")}</li>
                                <li className="hover:underline cursor-pointer">{t("AirCover pour les hôtes")}</li>
                                <li className="hover:underline cursor-pointer">{t("Ressources")}</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">MboaMaison</h3>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="hover:underline cursor-pointer">{t("Newsroom")}</li>
                                <li className="hover:underline cursor-pointer">{t("Carrières")}</li>
                                <li className="hover:underline cursor-pointer">{t("Investisseurs")}</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                            <span>© 2025 MboaMaison, Inc.</span>
                            <span>·</span>
                            <span className="hover:underline cursor-pointer">{t("Confidentialité")}</span>
                            <span>·</span>
                            <span className="hover:underline cursor-pointer">{t("Conditions")}</span>
                            <span>·</span>
                            <span className="hover:underline cursor-pointer">{t("Plan du site")}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 hover:underline">
                                <Globe className="h-4 w-4" />
                                <span>{t("Français (FR)")}</span>
                            </button>
                            <span>FCFA</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
