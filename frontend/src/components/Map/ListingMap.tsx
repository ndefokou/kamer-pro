import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ListingMapProps {
    latitude?: number | null;
    longitude?: number | null;
    title: string;
}

const ListingMap = ({ latitude, longitude, title }: ListingMapProps) => {
    const { t } = useTranslation();
    const lat = latitude || 4.0511; // Default fallback
    const lng = longitude || 9.7679;

    return (
        <MapContainer
            center={[lat, lng]}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]}>
                <Popup>
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm text-gray-600">{t('listing.details.exactLocation')}</div>
                </Popup>
            </Marker>
        </MapContainer>
    );
};

export default ListingMap;
