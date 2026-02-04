import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon, LatLng, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with Webpack/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIconProto = Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
delete DefaultIconProto._getIconUrl;
Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

interface LatLngLiteral {
    lat: number;
    lng: number;
}

// Component to handle map centering
function MapController({ center, zoom }: { center: LatLngLiteral; zoom?: number }) {
    const map = useMap();

    useEffect(() => {
        map.setView(center, zoom || map.getZoom());
    }, [center, zoom, map]);

    return null;
}

// Component to handle map clicks and marker dragging
function LocationMarker({
    position,
    setPosition
}: {
    position: LatLngLiteral;
    setPosition: (pos: LatLngLiteral) => void;
}) {
    const markerRef = useRef<LeafletMarker | null>(null);

    const eventHandlers = {
        dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                setPosition(marker.getLatLng());
            }
        },
    };

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    );
}

interface HostLocationMapProps {
    initialPosition: LatLngLiteral;
    mapCenter: LatLngLiteral;
    mapZoom: number;
    position: LatLngLiteral;
    setPosition: (pos: LatLngLiteral) => void;
}

const HostLocationMap = ({ initialPosition, mapCenter, mapZoom, position, setPosition }: HostLocationMapProps) => {
    return (
        <MapContainer
            center={initialPosition}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />
            <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
    );
};

export default HostLocationMap;
