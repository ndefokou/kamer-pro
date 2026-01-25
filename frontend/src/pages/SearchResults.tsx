import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Heart, Star, Menu, User, Globe, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, Product, getTowns, TownCount } from "@/api/client";
import MboaMaissonSearch from "@/components/Search";
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
import { useWishlist } from "@/hooks/useWishlist";
import Header from "@/components/Header";
import HorizontalPropertySection from "@/components/HorizontalPropertySection";
import PropertyCard from "@/components/PropertyCard";

// Fix Leaflet default icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
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
    const { addToWishlist, removeFromWishlistByProduct, isInWishlist } = useWishlist();

    // Get search params
    const location = searchParams.get("search") || "";
    const checkin = searchParams.get("checkin");
    const checkout = searchParams.get("checkout");
    const guests = parseInt(searchParams.get("guests") || "0");

    const { data: properties, isLoading } = useQuery<Product[]>({
        queryKey: ["products", location, guests],
        queryFn: () => getProducts({
            location: location || undefined,
            guests: guests > 0 ? guests : undefined,
        }),
    });

    const { data: towns } = useQuery<TownCount[]>({
        queryKey: ["towns"],
        queryFn: getTowns,
    });

    const filteredProperties = useMemo(() => {
        if (!properties) return [] as Product[];
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

    const groupedByCity = useMemo(() => {
        const map: Record<string, Product[]> = {};
        for (const p of filteredProperties) {
            const key = (p.listing.city || "Unknown").trim();
            if (!map[key]) map[key] = [];
            map[key].push(p);
        }
        const ordered = Object.entries(map);
        if (towns && towns.length > 0) {
            const order = towns.map((t) => t.city.toLowerCase());
            ordered.sort((a, b) => {
                const ia = order.indexOf(a[0].toLowerCase());
                const ib = order.indexOf(b[0].toLowerCase());
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a[0].localeCompare(b[0]);
            });
        } else {
            ordered.sort((a, b) => a[0].localeCompare(b[0]));
        }
        return ordered;
    }, [filteredProperties, towns]);

    // Use all properties with coordinates for the map, regardless of left-side filters
    const mapProperties = useMemo(() => {
        return (properties || []).filter(
            (p) => p.listing.latitude && p.listing.longitude
        );
    }, [properties]);

    // Compute bounds to fit all markers
    const mapBounds = useMemo(() => {
        const pts = mapProperties.map(
            (p) => [p.listing.latitude as number, p.listing.longitude as number] as [number, number]
        );
        return pts.length ? L.latLngBounds(pts) : undefined;
    }, [mapProperties]);

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
                    <DropdownMenuItem onClick={() => navigate('/webauth-login?tab=register&redirect=/host/dashboard')} className="font-semibold">
                        {t("Become a host")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/webauth-login')}>
                        {t("Log in or sign up")}
                    </DropdownMenuItem>
                </>
            )}
        </>
    );

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <Header />

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

                    {towns && towns.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-2 px-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                            {towns.map((t) => (
                                <button
                                    key={t.city}
                                    onClick={() => navigate(`/marketplace?search=${encodeURIComponent(t.city)}${guests>0?`&guests=${guests}`:''}`)}
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
                            <p className="text-muted-foreground animate-pulse">Loading stays...</p>
                        </div>
                    ) : filteredProperties.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-600">No stays found matching your criteria.</p>
                            <Button variant="outline" className="mt-4" onClick={() => navigate('/') }>
                                Clear filters
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
                                            location={product.listing.city ?? "Unknown"}
                                            price={product.listing.price_per_night ?? 0}
                                            images={product.photos.map((photo) => ({ image_url: photo.url }))}
                                        />
                                    </div>
                                ))}
                            </HorizontalPropertySection>
                        ))
                    )}

                    {/* Pagination removed */}
                </div>

                {/* Map (Right) */}
                <div className="hidden md:block w-[40%] lg:w-[45%] xl:w-[50%] h-[calc(100vh-80px)] sticky top-20">
                    <MapContainer
                        center={[3.8480, 11.5021]} // Default to Yaounde
                        zoom={13}
                        scrollWheelZoom={true}
                        className="h-full w-full"
                        bounds={mapBounds}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {mapProperties.map((product) => (
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

