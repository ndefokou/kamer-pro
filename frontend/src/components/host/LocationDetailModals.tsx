import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

// Scenic view options
const SCENIC_VIEW_OPTIONS = [
    'Bay view',
    'Beach view',
    'Canal view',
    'City skyline view',
    'Courtyard view',
    'Desert view',
    'Garden view',
    'Golf course view',
    'Harbor view',
    'Lake view',
    'Marina view',
    'Mountain view',
    'Ocean view',
    'Park view',
    'Pool view',
    'Resort view',
    'River view',
    'Valley view',
    'Vineyard view',
    'Water view',
];

interface LocationDetailModalsProps {
    // Address Modal
    showAddressModal: boolean;
    onCloseAddressModal: () => void;
    address: string;
    city: string;
    country: string;
    onSaveAddress: (data: { address: string; city: string; country: string }) => void;

    // Neighborhood Modal
    showNeighborhoodModal: boolean;
    onCloseNeighborhoodModal: () => void;
    neighborhoodDescription: string;
    onSaveNeighborhood: (description: string) => void;

    // Getting Around Modal
    showGettingAroundModal: boolean;
    onCloseGettingAroundModal: () => void;
    gettingAroundDescription: string;
    onSaveGettingAround: (description: string) => void;

    // Scenic Views Modal
    showScenicViewsModal: boolean;
    onCloseScenicViewsModal: () => void;
    scenicViews: string[];
    onSaveScenicViews: (views: string[]) => void;

    // Location Sharing Modal
    showLocationSharingModal: boolean;
    onCloseLocationSharingModal: () => void;
    showGeneralLocation: boolean;
    onSaveLocationSharing: (show: boolean) => void;
}

export const LocationDetailModals: React.FC<LocationDetailModalsProps> = ({
    showAddressModal,
    onCloseAddressModal,
    address,
    city,
    country,
    onSaveAddress,
    showNeighborhoodModal,
    onCloseNeighborhoodModal,
    neighborhoodDescription,
    onSaveNeighborhood,
    showGettingAroundModal,
    onCloseGettingAroundModal,
    gettingAroundDescription,
    onSaveGettingAround,
    showScenicViewsModal,
    onCloseScenicViewsModal,
    scenicViews,
    onSaveScenicViews,
    showLocationSharingModal,
    onCloseLocationSharingModal,
    showGeneralLocation,
    onSaveLocationSharing,
}) => {
    // Local state for editing
    const [editAddress, setEditAddress] = useState(address);
    const [editCity, setEditCity] = useState(city);
    const [editCountry, setEditCountry] = useState(country);
    const [editNeighborhood, setEditNeighborhood] = useState(neighborhoodDescription);
    const [editGettingAround, setEditGettingAround] = useState(gettingAroundDescription);
    const [editScenicViews, setEditScenicViews] = useState<string[]>(scenicViews);
    const [editShowGeneralLocation, setEditShowGeneralLocation] = useState(showGeneralLocation);

    // Update local state when props change
    React.useEffect(() => {
        setEditAddress(address);
        setEditCity(city);
        setEditCountry(country);
    }, [address, city, country]);

    React.useEffect(() => {
        setEditNeighborhood(neighborhoodDescription);
    }, [neighborhoodDescription]);

    React.useEffect(() => {
        setEditGettingAround(gettingAroundDescription);
    }, [gettingAroundDescription]);

    React.useEffect(() => {
        setEditScenicViews(scenicViews);
    }, [scenicViews]);

    React.useEffect(() => {
        setEditShowGeneralLocation(showGeneralLocation);
    }, [showGeneralLocation]);

    const toggleScenicView = (view: string) => {
        setEditScenicViews(prev =>
            prev.includes(view)
                ? prev.filter(v => v !== view)
                : [...prev, view]
        );
    };

    return (
        <>
            {/* Address Modal */}
            {showAddressModal && (
                <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Address</h2>
                        <button onClick={onCloseAddressModal} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">Street address</label>
                            <Input
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                placeholder="nkolbisson"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-2">Apt, floor, bldg (if applicable)</label>
                            <Input placeholder="" className="w-full" />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-2">City / town / village</label>
                            <Input
                                value={editCity}
                                onChange={(e) => setEditCity(e.target.value)}
                                placeholder="Douala"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-2">Province / state / territory (if applicable)</label>
                            <Input
                                value={editCountry}
                                onChange={(e) => setEditCountry(e.target.value)}
                                placeholder="Littoral Region"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-2">Postal code (if applicable)</label>
                            <Input placeholder="" className="w-full" />
                        </div>
                    </div>

                    <div className="p-6 border-t flex justify-between">
                        <Button variant="ghost" onClick={onCloseAddressModal}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-black text-white hover:bg-gray-800"
                            onClick={() => {
                                onSaveAddress({ address: editAddress, city: editCity, country: editCountry });
                                onCloseAddressModal();
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            )}

            {/* Neighborhood Description Modal */}
            {showNeighborhoodModal && (
                <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Neighborhood description</h2>
                        <button onClick={onCloseNeighborhoodModal} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <p className="text-gray-600 mb-4">Share some highlights about the neighborhood.</p>
                        <textarea
                            value={editNeighborhood}
                            onChange={(e) => setEditNeighborhood(e.target.value)}
                            className="w-full h-64 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                            placeholder="Describe the neighborhood..."
                        />
                    </div>

                    <div className="p-6 border-t flex justify-between">
                        <Button variant="ghost" onClick={onCloseNeighborhoodModal}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-black text-white hover:bg-gray-800"
                            onClick={() => {
                                onSaveNeighborhood(editNeighborhood);
                                onCloseNeighborhoodModal();
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            )}

            {/* Getting Around Modal */}
            {showGettingAroundModal && (
                <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Getting around</h2>
                        <button onClick={onCloseGettingAroundModal} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <p className="text-gray-600 mb-4">Share transportation options and parking details.</p>
                        <textarea
                            value={editGettingAround}
                            onChange={(e) => setEditGettingAround(e.target.value)}
                            className="w-full h-64 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                            placeholder="Describe how to get around..."
                        />
                    </div>

                    <div className="p-6 border-t flex justify-between">
                        <Button variant="ghost" onClick={onCloseGettingAroundModal}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-black text-white hover:bg-gray-800"
                            onClick={() => {
                                onSaveGettingAround(editGettingAround);
                                onCloseGettingAroundModal();
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            )}

            {/* Scenic Views Modal */}
            {showScenicViewsModal && (
                <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Scenic views</h2>
                        <button onClick={onCloseScenicViewsModal} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-2">
                            {SCENIC_VIEW_OPTIONS.map((view) => (
                                <label
                                    key={view}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    <span className="text-gray-900">{view}</span>
                                    <input
                                        type="checkbox"
                                        checked={editScenicViews.includes(view)}
                                        onChange={() => toggleScenicView(view)}
                                        className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 border-t flex justify-between">
                        <Button variant="ghost" onClick={onCloseScenicViewsModal}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-black text-white hover:bg-gray-800"
                            onClick={() => {
                                onSaveScenicViews(editScenicViews);
                                onCloseScenicViewsModal();
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            )}

            {/* Location Sharing Modal */}
            {showLocationSharingModal && (
                <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Location sharing</h2>
                        <button onClick={onCloseLocationSharingModal} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-gray-900 mb-2">General location</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Guests will see an approximate location on the map before booking. Your exact address is only shared after a reservation is confirmed.
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">Show listing's general location</div>
                                    <div className="text-sm text-gray-500 mt-1">Display approximate location to guests</div>
                                </div>
                                <button
                                    onClick={() => setEditShowGeneralLocation(!editShowGeneralLocation)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editShowGeneralLocation ? 'bg-black' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editShowGeneralLocation ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {editShowGeneralLocation && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-700">
                                        <strong>Note:</strong> Guests will see a circle on the map showing the general area where your property is located. The exact address will only be revealed after they complete their booking.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t flex justify-between">
                        <Button variant="ghost" onClick={onCloseLocationSharingModal}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-black text-white hover:bg-gray-800"
                            onClick={() => {
                                onSaveLocationSharing(editShowGeneralLocation);
                                onCloseLocationSharingModal();
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            )}

            {/* Overlay */}
            {(showAddressModal || showNeighborhoodModal || showGettingAroundModal || showScenicViewsModal || showLocationSharingModal) && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => {
                        onCloseAddressModal();
                        onCloseNeighborhoodModal();
                        onCloseGettingAroundModal();
                        onCloseScenicViewsModal();
                        onCloseLocationSharingModal();
                    }}
                />
            )}
        </>
    );
};
