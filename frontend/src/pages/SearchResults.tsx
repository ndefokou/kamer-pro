import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Heart, Star, Menu, User, Globe, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, Product } from "@/api/client";
import AirbnbSearch from "@/components/Search";
import { getImageUrl } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

// Fix Leaflet default icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const SearchResults = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, logout } = useAuth();
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    // Get search params
    const location = searchParams.get("search") || "";
    const checkin = searchParams.get("checkin");
    const checkout = searchParams.get("checkout");
    const guests = parseInt(searchParams.get("guests") || "0");

    const { data: properties, isLoading } = useQuery<Product[]>({
        queryKey: ["products"],
        queryFn: () => getProducts({}),
    });

    const filteredProperties = useMemo(() => {
        if (!properties) return [];
        return properties.filter((p) => {
            // Filter by location
            if (location && !p.listing.city?.toLowerCase().includes(location.toLowerCase()) &&
                !p.listing.address?.toLowerCase().includes(location.toLowerCase())) {
                return false;
            }

            // Filter by guests
            if (guests > 0 && (p.listing.max_guests || 0) < guests) {
                return false;
            }

            // Date filtering would go here if we had availability data in the product list
            // For now, we assume available

            return true;
        });
    }, [properties, location, guests]);

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

    const UserMenuContent = () => (
        <>
            {user ? (
                <>
                    <DropdownMenuItem className="font-semibold" onClick={() => navigate('/host/dashboard')}>
                        {t("Gérer mon annonce")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                        {t("Compte")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        {t("Déconnexion")}
                    </DropdownMenuItem>
                </>
            ) : (
                <>
                    <DropdownMenuItem onClick={() => navigate('/webauth-login?tab=register')} className="font-semibold">
                        {t("Devenir hôte")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/webauth-login')}>
                        {t("Se connecter ou s'inscrire")}
                    </DropdownMenuItem>
                </>
            )}
        </>
    );

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="border-b border-gray-200 sticky top-0 z-50 bg-white">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                            <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <span className="text-xl font-bold text-green-600 hidden md:block">MboaMaison</span>
                        </div>

                        {/* Search Bar */}
                        <div className="flex-1 max-w-2xl px-4">
                            <AirbnbSearch />
                        </div>

                        {/* Right Menu */}
                        <div className="flex items-center gap-4">
                            <button
                                className="text-sm font-semibold hover:bg-gray-100 px-4 py-3 rounded-full transition-colors hidden md:block"
                                onClick={() => navigate('/webauth-login?tab=register')}
                            >
                                {t("Devenir hôte")}
                            </button>
                            <button className="p-3 hover:bg-gray-100 rounded-full transition-colors">
                                <Globe className="h-5 w-5" />
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex items-center gap-3 border border-gray-300 rounded-full px-3 py-2 hover:shadow-md transition-shadow cursor-pointer">
                                        <Menu className="h-4 w-4" />
                                        <div className="bg-gray-700 rounded-full p-1.5">
                                            <User className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    <UserMenuContent />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Listings List (Left) */}
                <div className="w-full md:w-[60%] lg:w-[55%] xl:w-[50%] overflow-y-auto p-6">
                    <div className="mb-4">
                        <p className="text-sm text-gray-500">
                            {filteredProperties.length} {filteredProperties.length === 1 ? "stay" : "stays"}
                            {location ? ` in ${location}` : ""}
                        </p>
                        <h1 className="text-2xl font-bold mt-1">Stays in {location || "Cameroon"}</h1>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {isLoading ? (
                            <div className="col-span-full text-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4" />
                                <p className="text-gray-600">Loading stays...</p>
                            </div>
                        ) : filteredProperties.length === 0 ? (
                            <div className="col-span-full text-center py-20">
                                <p className="text-gray-600">No stays found matching your criteria.</p>
                                <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
                                    Clear filters
                                </Button>
                            </div>
                        ) : (
                            filteredProperties.map((product) => (
                                <div key={product.listing.id} className="group cursor-pointer" onClick={() => navigate(`/product/${product.listing.id}`)}>
                                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                                        <img
                                            src={getImageUrl(product.photos[0]?.url) || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=400&fit=crop"}
                                            alt={product.listing.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                                        <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-md text-xs font-semibold shadow-sm">
                                            Guest favorite
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-gray-900 truncate flex-1">{product.listing.title}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500">{product.listing.property_type}</p>
                                        <p className="text-sm text-gray-500">16-25 dec.</p>
                                        <div className="flex items-baseline gap-1 pt-1">
                                            <span className="font-semibold text-gray-900">{product.listing.price_per_night?.toLocaleString()} FCFA</span>
                                            <span className="text-sm text-gray-600">par nuit</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredProperties.length > 0 && (
                        <div className="flex justify-center items-center gap-4 mt-12 mb-8">
                            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50" disabled>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentcolor', strokeWidth: 5.33333, overflow: 'visible' }}><path fill="none" d="M20 28 8.7 16.7a1 1 0 0 1 0-1.4L20 4"></path></svg>
                            </button>
                            <div className="flex gap-2">
                                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white font-medium text-sm">1</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 font-medium text-sm">2</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 font-medium text-sm">3</button>
                            </div>
                            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentcolor', strokeWidth: 5.33333, overflow: 'visible' }}><path fill="none" d="m12 4 11.3 11.3a1 1 0 0 1 0 1.4L12 28"></path></svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Map (Right) */}
                <div className="hidden md:block w-[40%] lg:w-[45%] xl:w-[50%] h-[calc(100vh-80px)] sticky top-20">
                    <MapContainer
                        center={[3.8480, 11.5021]} // Default to Yaounde
                        zoom={13}
                        scrollWheelZoom={true}
                        className="h-full w-full"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {filteredProperties.map((product) => (
                            product.listing.latitude && product.listing.longitude && (
                                <Marker
                                    key={product.listing.id}
                                    position={[product.listing.latitude, product.listing.longitude]}
                                >
                                    <Popup>
                                        <div className="w-48">
                                            <img
                                                src={getImageUrl(product.photos[0]?.url) || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=400&fit=crop"}
                                                alt={product.listing.title}
                                                className="w-full h-32 object-cover rounded-lg mb-2"
                                            />
                                            <h3 className="font-semibold text-sm truncate">{product.listing.title}</h3>
                                            <p className="text-sm font-bold">{product.listing.price_per_night?.toLocaleString()} FCFA</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default SearchResults;
