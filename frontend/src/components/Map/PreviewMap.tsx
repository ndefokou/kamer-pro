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

interface PreviewMapProps {
    latitude?: number;
    longitude?: number;
    title: string;
    selectedCategory: string | null;
}

const getCategoryIconHtml = (category: string) => {
    // SVG strings for icons
    switch (category) {
        case 'restaurants':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';
        case 'shopping':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
        case 'transport':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>';
        case 'attractions':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>';
        case 'groceries':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
        default:
            return '';
    }
};

const getNearbyPlaces = (category: string, lat: number, lng: number) => {
    const places = [];
    const count = 5;
    const radius = 0.01;

    for (let i = 0; i < count; i++) {
        const seed = category.charCodeAt(0) + i;
        const latOffset = ((seed * 9301 + 49297) % 233280) / 233280 * radius * 2 - radius;
        const lngOffset = ((seed * 49297 + 9301) % 233280) / 233280 * radius * 2 - radius;

        let name = '';
        switch (category) {
            case 'restaurants':
                name = ['Local Delights', 'Spicy Corner', 'Mama\'s Kitchen', 'City Grill', 'Tasty Bites'][i % 5];
                break;
            case 'shopping':
                name = ['City Mall', 'Fashion Hub', 'Local Market', 'Souvenir Shop', 'Boutique'][i % 5];
                break;
            case 'transport':
                name = ['Bus Station', 'Taxi Stand', 'Train Station', 'Metro Stop', 'Airport Shuttle'][i % 5];
                break;
            case 'attractions':
                name = ['City Park', 'Museum', 'Historic Monument', 'Art Gallery', 'Botanical Garden'][i % 5];
                break;
            case 'groceries':
                name = ['Supermarket', 'Fresh Market', 'Convenience Store', 'Bakery', 'Organic Shop'][i % 5];
                break;
        }

        places.push({
            name,
            lat: lat + latOffset,
            lng: lng + lngOffset
        });
    }
    return places;
};

const PreviewMap = ({ latitude, longitude, title, selectedCategory }: PreviewMapProps) => {
    const { t } = useTranslation();
    const lat = latitude || 4.0511;
    const lng = longitude || 9.7679;

    return (
        <MapContainer
            center={[lat, lng]}
            zoom={13}
            scrollWheelZoom={false}
            preferCanvas={true}
            className="h-full w-full"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]}>
                <Popup>
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm text-gray-600">{t('preview.location.exact', 'Exact location provided after booking')}</div>
                </Popup>
            </Marker>

            {selectedCategory && (
                <>
                    {getNearbyPlaces(selectedCategory, lat, lng).map((place, idx) => (
                        <Marker
                            key={idx}
                            position={[place.lat, place.lng]}
                            icon={L.divIcon({
                                className: 'bg-transparent',
                                html: `<div class="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200 text-gray-700">
                                            ${getCategoryIconHtml(selectedCategory)}
                                        </div>`,
                                iconSize: [32, 32],
                                iconAnchor: [16, 16]
                            })}
                        >
                            <Popup>
                                <div className="font-semibold">{place.name}</div>
                                <div className="text-sm text-gray-600 capitalize">{selectedCategory}</div>
                            </Popup>
                        </Marker>
                    ))}
                </>
            )}
        </MapContainer>
    );
};

export default PreviewMap;
