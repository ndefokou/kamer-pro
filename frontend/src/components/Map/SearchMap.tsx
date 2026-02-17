import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import OptimizedImage from "@/components/OptimizedImage";
import NearbyPOI from "@/components/NearbyPOI";
import { getImageUrl, formatPrice } from "@/lib/utils";
import { Product } from "@/api/client";

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

interface SearchMapProps {
    mapPoints: { id: string; lat: number; lon: number; product: Product }[];
    singlePoint?: [number, number] | null;
    fallbackCenter?: [number, number] | null;
}

const FitMapBounds = ({ mapPoints, singlePoint, fallbackCenter }: { mapPoints: { lat: number, lon: number }[], singlePoint?: [number, number] | null, fallbackCenter?: [number, number] | null }) => {
    const map = useMap();

    useEffect(() => {
        if (singlePoint) {
            map.setView(singlePoint, 12);
        } else if (mapPoints.length > 0) {
            const pts = mapPoints.map((p) => [p.lat, p.lon] as [number, number]);
            const bounds = L.latLngBounds(pts);
            map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
        } else if (fallbackCenter) {
            map.setView(fallbackCenter, 13);
        }
    }, [map, mapPoints, singlePoint, fallbackCenter]);
    return null;
};

const SearchMap = ({ mapPoints, singlePoint, fallbackCenter }: SearchMapProps) => {
    return (
        <MapContainer
            center={(fallbackCenter as [number, number]) || [3.8480, 11.5021]}
            zoom={13}
            scrollWheelZoom={true}
            preferCanvas={true}
            className="h-full w-full"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMapBounds mapPoints={mapPoints} singlePoint={singlePoint} fallbackCenter={fallbackCenter} />
            <NearbyPOI />
            {mapPoints.map(({ id, lat, lon, product }) => (
                <Marker key={id} position={[lat, lon]}>
                    <Popup>
                        <div className="w-48">
                            <OptimizedImage
                                src={getImageUrl(product.photos[0]?.url) || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=400&fit=crop"}
                                alt={product.listing.title}
                                className="w-full h-32 object-cover rounded-lg mb-2"
                            />
                            <h3 className="font-semibold text-sm truncate">{product.listing.title}</h3>
                            <p className="text-sm font-bold">{formatPrice(product.listing.price_per_night || 0)}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default SearchMap;
