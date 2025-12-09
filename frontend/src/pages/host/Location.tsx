import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Search, X } from 'lucide-react';
import apiClient from '@/api/client';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with Webpack/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Default center: Cameroon
const DEFAULT_CENTER: [number, number] = [7.3697, 12.3547];
const DEFAULT_ZOOM = 6;

interface GeocodingResult {
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        country?: string;
    };
}

// Component to handle map centering
function MapController({ center, zoom }: { center: LatLng; zoom?: number }) {
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
    position: LatLng;
    setPosition: (pos: LatLng) => void;
}) {
    const markerRef = useRef<any>(null);

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

// Helper to format location name from geocoding result
function getLocationName(result: GeocodingResult): string {
    const parts = result.display_name.split(',');
    // Return first 2-3 parts for a cleaner display
    return parts.slice(0, Math.min(3, parts.length)).join(',');
}

const Location: React.FC = () => {
    const navigate = useNavigate();
    const { draft, updateDraft, nextStep, previousStep } = useHost();

    // Check if we're editing an existing listing
    const searchParams = new URLSearchParams(window.location.search);
    const listingId = searchParams.get('listing');
    const isEditMode = !!listingId;

    // State for listing data when in edit mode
    const [listing, setListing] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Initialize position from draft or listing
    const getInitialPosition = () => {
        if (isEditMode && listing?.latitude && listing?.longitude) {
            return new LatLng(listing.latitude, listing.longitude);
        }
        if (draft.latitude && draft.longitude) {
            return new LatLng(draft.latitude, draft.longitude);
        }
        return new LatLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    };

    const initialPosition = getInitialPosition();

    const [position, setPosition] = useState<LatLng>(initialPosition);
    const [mapCenter, setMapCenter] = useState<LatLng>(initialPosition);
    const [mapZoom, setMapZoom] = useState<number>(
        (isEditMode && listing?.latitude && listing?.longitude) || (draft.latitude && draft.longitude) ? 13 : DEFAULT_ZOOM
    );
    const [searchQuery, setSearchQuery] = useState(
        isEditMode ? (listing?.address || '') : (draft.address || '')
    );
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(
        isEditMode ? (listing?.address || '') : (draft.address || '')
    );
    const [showResults, setShowResults] = useState(false);

    // Load listing data if in edit mode
    useEffect(() => {
        if (isEditMode && listingId) {
            const fetchListing = async () => {
                try {
                    const response = await apiClient.get(`/listings/${listingId}`);
                    const listingData = response.data.listing;
                    setListing(listingData);

                    if (listingData.latitude && listingData.longitude) {
                        const pos = new LatLng(listingData.latitude, listingData.longitude);
                        setPosition(pos);
                        setMapCenter(pos);
                        setMapZoom(13);
                    }

                    if (listingData.address) {
                        setSearchQuery(listingData.address);
                        setSelectedAddress(listingData.address);
                    }
                } catch (error) {
                    console.error('Failed to load listing:', error);
                }
            };
            fetchListing();
        }
    }, [isEditMode, listingId]);

    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 3) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            setShowResults(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
                );
                const data = await response.json();
                setSearchResults(data);
            } catch (error) {
                console.error('Geocoding error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectResult = (result: GeocodingResult) => {
        const newPos = new LatLng(parseFloat(result.lat), parseFloat(result.lon));
        setPosition(newPos);
        setMapCenter(newPos);
        setMapZoom(13);

        const locationName = getLocationName(result);
        setSearchQuery(locationName);
        setSelectedAddress(result.display_name);
        setShowResults(false);
        setSearchResults([]);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSelectedAddress('');
        setShowResults(false);
        setSearchResults([]);
    };

    const handleSave = async () => {
        const locationData = {
            latitude: position.lat,
            longitude: position.lng,
            address: selectedAddress || searchQuery || `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`,
        };

        if (isEditMode && listingId) {
            // Save directly to listing
            setSaving(true);
            try {
                await apiClient.put(`/listings/${listingId}`, locationData);
                // Navigate back to listing editor
                navigate(`/host/editor/${listingId}`);
            } catch (error) {
                console.error('Failed to save location:', error);
                alert('Failed to save location. Please try again.');
            } finally {
                setSaving(false);
            }
        } else {
            // Onboarding flow - save to draft and continue
            updateDraft(locationData);
            nextStep();
            navigate('/host/photos');
        }
    };

    const handleBack = () => {
        if (isEditMode && listingId) {
            // Navigate back to listing editor without saving
            navigate(`/host/editor/${listingId}`);
        } else {
            // Onboarding flow - save to draft and go back
            updateDraft({
                latitude: position.lat,
                longitude: position.lng,
                address: selectedAddress || searchQuery || `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`,
            });
            previousStep();
            navigate('/host/amenities');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="p-4 md:p-8 pb-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Where's your place located?</h1>
                    <p className="text-muted-foreground">
                        Your address is only shared with guests after they've made a reservation.
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 md:px-8 pb-4">
                <div className="max-w-4xl mx-auto relative">
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Enter a location..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => {
                                if (searchResults.length > 0) {
                                    setShowResults(true);
                                }
                            }}
                            className="pl-10 pr-10 py-6 text-lg"
                        />
                        {searchQuery && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && searchResults.length > 0 && (
                        <div className="absolute z-[1000] w-full mt-2 bg-background border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                            {searchResults.map((result, index) => {
                                const parts = result.display_name.split(',');
                                const mainLocation = parts[0];
                                const subLocation = parts.slice(1).join(',');

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectResult(result)}
                                        className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0 flex items-start gap-3"
                                    >
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-foreground truncate">
                                                {mainLocation}
                                            </div>
                                            <div className="text-sm text-muted-foreground truncate">
                                                {subLocation}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {isSearching && showResults && (
                        <div className="absolute z-[1000] w-full mt-2 bg-background border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                            Searching...
                        </div>
                    )}

                    {showResults && !isSearching && searchResults.length === 0 && searchQuery.length >= 3 && (
                        <div className="absolute z-[1000] w-full mt-2 bg-background border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                            No results found
                        </div>
                    )}
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 px-4 md:px-8 pb-4">
                <div className="max-w-4xl mx-auto h-[400px] md:h-[500px] rounded-lg overflow-hidden border-2 border-border shadow-lg">
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
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="px-4 md:px-8 pb-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center pt-6 border-t">
                        <Button variant="outline" onClick={handleBack} size="lg">
                            {isEditMode ? 'Cancel' : 'Back'}
                        </Button>
                        <Button onClick={handleSave} size="lg" disabled={saving}>
                            {saving ? 'Saving...' : (isEditMode ? 'Save' : 'Continue')}
                        </Button>
                    </div>

                    {!isEditMode && (
                        <div className="mt-4 text-center text-sm text-muted-foreground">
                            Step 3 of 10
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Location;


