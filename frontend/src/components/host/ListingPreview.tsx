import React, { useState } from 'react';
import { X, Share, Heart, Star, Users, Home, MapPin, Wifi, Calendar, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/utils';
import { AMENITY_DETAILS } from '@/data/amenities';
import { HouseRules } from './HouseRulesSection';

interface Listing {
    id: string;
    title: string;
    description: string;
    property_type: string;
    room_type: string;
    price_per_night: number;
    currency: string;
    max_guests: number;
    city: string;
    country: string;
    address: string;
    latitude: number;
    longitude: number;
    amenities: string[];
    photos: { id: string; url: string; caption: string }[];
    status: string;
    house_rules: string;
}

interface ListingPreviewProps {
    listing: Listing;
    isOpen: boolean;
    onClose: () => void;
}

const ListingPreview: React.FC<ListingPreviewProps> = ({ listing, isOpen, onClose }) => {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [showAllAmenities, setShowAllAmenities] = useState(false);
    const [checkInDate, setCheckInDate] = useState<Date | null>(null);
    const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [infants, setInfants] = useState(0);
    const [pets, setPets] = useState(0);
    const [showGuestPicker, setShowGuestPicker] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showPhotoGallery, setShowPhotoGallery] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const totalGuests = adults + children;

    // Keyboard navigation for photo gallery
    React.useEffect(() => {
        if (!showPhotoGallery || selectedPhotoIndex === -1) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && selectedPhotoIndex > 0) {
                setSelectedPhotoIndex(selectedPhotoIndex - 1);
            } else if (e.key === 'ArrowRight' && selectedPhotoIndex < listing.photos.length - 1) {
                setSelectedPhotoIndex(selectedPhotoIndex + 1);
            } else if (e.key === 'Escape') {
                setShowPhotoGallery(false);
                setSelectedPhotoIndex(-1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPhotoGallery, selectedPhotoIndex, listing.photos.length]);

    if (!isOpen) return null;

    // Parse house rules
    let houseRules: HouseRules | null = null;
    try {
        houseRules = listing.house_rules ? JSON.parse(listing.house_rules) : null;
    } catch (e) {
        console.error('Failed to parse house rules:', e);
    }

    const nextPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev + 1) % listing.photos.length);
    };

    const prevPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev - 1 + listing.photos.length) % listing.photos.length);
    };

    // Calendar helper functions
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const isSameDay = (date1: Date | null, date2: Date) => {
        if (!date1) return false;
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    };

    const isInRange = (date: Date) => {
        if (!checkInDate || !checkOutDate) return false;
        return date > checkInDate && date < checkOutDate;
    };

    const handleDateClick = (date: Date) => {
        if (!checkInDate || (checkInDate && checkOutDate)) {
            setCheckInDate(date);
            setCheckOutDate(null);
        } else {
            if (date > checkInDate) {
                setCheckOutDate(date);
            } else {
                setCheckInDate(date);
                setCheckOutDate(null);
            }
        }
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-12" />);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isCheckIn = isSameDay(checkInDate, date);
            const isCheckOut = isSameDay(checkOutDate, date);
            const inRange = isInRange(date);
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

            days.push(
                <button
                    key={day}
                    onClick={() => !isPast && handleDateClick(date)}
                    disabled={isPast}
                    className={`h-12 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                        ${isPast ? 'text-gray-300 cursor-not-allowed line-through' : 'hover:border hover:border-gray-900'}
                        ${isCheckIn || isCheckOut ? 'bg-gray-900 text-white' : ''}
                        ${inRange ? 'bg-gray-100' : ''}
                        ${!isPast && !isCheckIn && !isCheckOut && !inRange ? 'text-gray-900' : ''}
                    `}
                >
                    {day}
                </button>
            );
        }

        return (
            <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h4 className="text-lg font-semibold">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h4>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {dayNames.map(day => (
                        <div key={day} className="h-12 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
            {/* Header */}
            <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Share className="h-4 w-4" />
                            <span className="text-sm font-medium underline">Share</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Heart className="h-4 w-4" />
                            <span className="text-sm font-medium underline">Save</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Title */}
                <h1 className="text-3xl font-semibold mb-2">{listing.title || 'Untitled Listing'}</h1>
                <div className="flex items-center gap-4 text-sm mb-6">
                    <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-medium">New</span>
                    </div>
                    <span className="text-gray-600">·</span>
                    <span className="underline font-medium">{listing.city}, {listing.country}</span>
                </div>

                {/* Photo Gallery */}
                <div className="mb-8 rounded-xl overflow-hidden">
                    {listing.photos.length > 0 ? (
                        <div className="relative">
                            {listing.photos.length === 1 ? (
                                <img
                                    src={getImageUrl(listing.photos[0].url)}
                                    alt={listing.photos[0].caption || listing.title}
                                    className="w-full h-[500px] object-cover"
                                />
                            ) : listing.photos.length <= 4 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {listing.photos.slice(0, 4).map((photo, idx) => (
                                        <img
                                            key={photo.id}
                                            src={getImageUrl(photo.url)}
                                            alt={photo.caption || `Photo ${idx + 1}`}
                                            className={`w-full object-cover ${idx === 0 ? 'col-span-2 h-[400px]' : 'h-[250px]'}`}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-2 row-span-2">
                                        <img
                                            src={getImageUrl(listing.photos[0].url)}
                                            alt={listing.photos[0].caption}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {listing.photos.slice(1, 5).map((photo, idx) => (
                                        <img
                                            key={photo.id}
                                            src={getImageUrl(photo.url)}
                                            alt={photo.caption || `Photo ${idx + 2}`}
                                            className="w-full h-[250px] object-cover"
                                        />
                                    ))}
                                </div>
                            )}
                            {listing.photos.length > 5 && (
                                <button
                                    onClick={() => {
                                        setShowPhotoGallery(true);
                                        setSelectedPhotoIndex(-1); // Start with grid view
                                    }}
                                    className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg border border-gray-900 font-medium text-sm hover:bg-gray-50 transition-colors"
                                >
                                    Show all photos
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center">
                            <p className="text-gray-400">No photos available</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left Column - Main Info */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Host Info */}
                        <div className="pb-8 border-b border-gray-200">
                            <h2 className="text-2xl font-semibold mb-4">
                                {listing.property_type} hosted by Arthur
                            </h2>
                            <div className="flex items-center gap-2 text-gray-600">
                                <span>{listing.max_guests} guests</span>
                                <span>·</span>
                                <span>1 bedroom</span>
                                <span>·</span>
                                <span>1 bed</span>
                                <span>·</span>
                                <span>1 bath</span>
                            </div>
                        </div>

                        {/* Description */}
                        {listing.description && (
                            <div className="pb-8 border-b border-gray-200">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {listing.description}
                                </p>
                            </div>
                        )}

                        {/* Amenities */}
                        {listing.amenities && listing.amenities.length > 0 && (
                            <div className="pb-8 border-b border-gray-200">
                                <h3 className="text-xl font-semibold mb-6">What this place offers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(showAllAmenities ? listing.amenities : listing.amenities.slice(0, 10)).map((amenityKey) => {
                                        const amenity = AMENITY_DETAILS[amenityKey];
                                        if (!amenity) return null;
                                        const Icon = amenity.icon;
                                        return (
                                            <div key={amenityKey} className="flex items-center gap-4">
                                                <Icon className="h-6 w-6 text-gray-700" />
                                                <span className="text-gray-900">{amenity.label}</span>
                                            </div>
                                        );
                                    })}

                                    {/* Show unavailable amenities when expanded */}
                                    {showAllAmenities && (() => {
                                        // Common amenities to check for
                                        const commonAmenities = [
                                            'wifi', 'tv', 'kitchen', 'washer', 'parking', 'air_conditioning',
                                            'workspace', 'pool', 'hottub', 'gym', 'bbq', 'fireplace',
                                            'smoke_alarm', 'carbon_monoxide_alarm'
                                        ];

                                        const unavailableAmenities = commonAmenities.filter(
                                            key => !listing.amenities?.includes(key) && AMENITY_DETAILS[key]
                                        );

                                        return unavailableAmenities.slice(0, 6).map((amenityKey) => {
                                            const amenity = AMENITY_DETAILS[amenityKey];
                                            const Icon = amenity.icon;
                                            return (
                                                <div key={`unavailable-${amenityKey}`} className="flex items-center gap-4 opacity-60">
                                                    <Icon className="h-6 w-6 text-gray-400" />
                                                    <span className="text-gray-500 line-through">{amenity.label}</span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                                {listing.amenities.length > 10 && (
                                    <Button
                                        variant="outline"
                                        className="mt-6 rounded-lg border-gray-900 font-semibold"
                                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                                    >
                                        {showAllAmenities ? 'Show less' : `Show all ${listing.amenities.length} amenities`}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Calendar */}
                        <div className="pb-8 border-b border-gray-200">
                            <h3 className="text-xl font-semibold mb-6">Select check-in date</h3>
                            <p className="text-gray-500 text-sm mb-4">Add your travel dates for exact pricing</p>
                            {renderCalendar()}
                        </div>
                    </div>

                    {/* Right Column - Booking Widget */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 border border-gray-200 rounded-xl p-6 shadow-xl">
                            <div className="mb-6">
                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-2xl font-semibold">${listing.price_per_night}</span>
                                    <span className="text-gray-600">night</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm">
                                    <Star className="h-4 w-4 fill-current" />
                                    <span className="font-medium">New</span>
                                </div>
                            </div>

                            <div className="border border-gray-300 rounded-lg mb-4">
                                <div className="grid grid-cols-2 border-b border-gray-300">
                                    <button
                                        onClick={() => setShowDatePicker(true)}
                                        className="p-3 border-r border-gray-300 text-left hover:bg-gray-50"
                                    >
                                        <div className="text-xs font-semibold uppercase mb-1">Check-in</div>
                                        <div className="text-sm text-gray-900">
                                            {checkInDate ? checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Add date'}
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setShowDatePicker(true)}
                                        className="p-3 text-left hover:bg-gray-50"
                                    >
                                        <div className="text-xs font-semibold uppercase mb-1">Checkout</div>
                                        <div className="text-sm text-gray-900">
                                            {checkOutDate ? checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Add date'}
                                        </div>
                                    </button>
                                </div>
                                <div className="p-3 relative">
                                    <button
                                        onClick={() => setShowGuestPicker(!showGuestPicker)}
                                        className="w-full text-left"
                                    >
                                        <div className="text-xs font-semibold uppercase mb-1">Guests</div>
                                        <div className="text-sm text-gray-900">
                                            {totalGuests} guest{totalGuests > 1 ? 's' : ''}
                                            {infants > 0 && `, ${infants} infant${infants > 1 ? 's' : ''}`}
                                            {pets > 0 && `, ${pets} pet${pets > 1 ? 's' : ''}`}
                                        </div>
                                    </button>

                                    {showGuestPicker && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 w-96">
                                            {/* Adults */}
                                            <div className="flex items-center justify-between py-4 border-b border-gray-200">
                                                <div>
                                                    <div className="font-semibold">Adults</div>
                                                    <div className="text-sm text-gray-500">Age 13+</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setAdults(Math.max(1, adults - 1))}
                                                        disabled={adults <= 1}
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${adults <= 1
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-400 text-gray-600 hover:border-black hover:text-black'
                                                            }`}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-medium">{adults}</span>
                                                    <button
                                                        onClick={() => setAdults(Math.min(listing.max_guests - children, adults + 1))}
                                                        disabled={totalGuests >= listing.max_guests}
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${totalGuests >= listing.max_guests
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-400 text-gray-600 hover:border-black hover:text-black'
                                                            }`}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Children */}
                                            <div className="flex items-center justify-between py-4 border-b border-gray-200">
                                                <div>
                                                    <div className="font-semibold">Children</div>
                                                    <div className="text-sm text-gray-500">Ages 2–12</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setChildren(Math.max(0, children - 1))}
                                                        disabled={children <= 0}
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${children <= 0
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-400 text-gray-600 hover:border-black hover:text-black'
                                                            }`}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-medium">{children}</span>
                                                    <button
                                                        onClick={() => setChildren(Math.min(listing.max_guests - adults, children + 1))}
                                                        disabled={totalGuests >= listing.max_guests}
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${totalGuests >= listing.max_guests
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-400 text-gray-600 hover:border-black hover:text-black'
                                                            }`}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Infants */}
                                            <div className="flex items-center justify-between py-4 border-b border-gray-200">
                                                <div>
                                                    <div className="font-semibold">Infants</div>
                                                    <div className="text-sm text-gray-500">Under 2</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setInfants(Math.max(0, infants - 1))}
                                                        disabled={infants <= 0}
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${infants <= 0
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-400 text-gray-600 hover:border-black hover:text-black'
                                                            }`}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-medium">{infants}</span>
                                                    <button
                                                        onClick={() => setInfants(infants + 1)}
                                                        className="w-8 h-8 rounded-full border border-gray-400 text-gray-600 hover:border-black hover:text-black flex items-center justify-center transition-colors"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Pets */}
                                            <div className="flex items-center justify-between py-4">
                                                <div>
                                                    <div className="font-semibold">Pets</div>
                                                    <div className="text-sm text-blue-600 underline cursor-pointer">Bringing a service animal?</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setPets(Math.max(0, pets - 1))}
                                                        disabled={pets <= 0}
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${pets <= 0
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-400 text-gray-600 hover:border-black hover:text-black'
                                                            }`}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-medium">{pets}</span>
                                                    <button
                                                        onClick={() => setPets(pets + 1)}
                                                        className="w-8 h-8 rounded-full border border-gray-400 text-gray-600 hover:border-black hover:text-black flex items-center justify-center transition-colors"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Info Text */}
                                            <div className="pt-4 border-t border-gray-200">
                                                <p className="text-xs text-gray-600">
                                                    This place has a maximum of {listing.max_guests} guests, not including infants. Pets aren't allowed.
                                                </p>
                                            </div>

                                            {/* Close Button */}
                                            <button
                                                onClick={() => setShowGuestPicker(false)}
                                                className="mt-4 w-full text-right text-sm font-semibold underline hover:text-gray-600"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button className="w-full bg-gradient-to-r from-[#E61E4D] to-[#D70466] hover:from-[#D70466] hover:to-[#BD1E59] text-white font-semibold py-3 rounded-lg mb-4">
                                Check availability
                            </Button>

                            <p className="text-center text-sm text-gray-500 mb-6">You won't be charged yet</p>

                            {checkInDate && checkOutDate && (
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="underline">
                                            ${listing.price_per_night} x {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights
                                        </span>
                                        <span>
                                            ${listing.price_per_night * Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="underline">Cleaning fee</span>
                                        <span>$50</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="underline">Service fee</span>
                                        <span>
                                            ${Math.round(listing.price_per_night * Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) * 0.14)}
                                        </span>
                                    </div>
                                    <div className="pt-3 border-t border-gray-200 flex justify-between font-semibold">
                                        <span>Total</span>
                                        <span>
                                            ${listing.price_per_night * Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) + 50 + Math.round(listing.price_per_night * Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) * 0.14)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Things to Know */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-semibold mb-6">Things to know</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* House Rules */}
                        <div>
                            <h4 className="font-semibold mb-4">House rules</h4>
                            <div className="space-y-2 text-sm text-gray-700">
                                {houseRules && (
                                    <>
                                        <p>Check-in: {houseRules.check_in_start} - {houseRules.check_in_end}</p>
                                        <p>Checkout: {houseRules.checkout_time}</p>
                                        <p>{listing.max_guests} guests maximum</p>
                                        {!houseRules.pets_allowed && <p>No pets</p>}
                                        {!houseRules.smoking_allowed && <p>No smoking</p>}
                                        {!houseRules.events_allowed && <p>No parties or events</p>}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Safety & Property */}
                        <div>
                            <h4 className="font-semibold mb-4">Safety & property</h4>
                            <div className="space-y-2 text-sm text-gray-700">
                                {/* Check for carbon monoxide alarm */}
                                {(listing as any).safety_items?.includes('carbon_monoxide_alarm') ? (
                                    <p>Carbon monoxide alarm</p>
                                ) : (
                                    <p>Carbon monoxide alarm not reported</p>
                                )}

                                {/* Check for smoke alarm */}
                                {(listing as any).safety_items?.includes('smoke_alarm') ? (
                                    <p>Smoke alarm</p>
                                ) : (
                                    <p>Smoke alarm not reported</p>
                                )}

                                {/* Show other safety devices if present */}
                                {(listing as any).safety_items?.includes('noise_decibel_monitor') && (
                                    <p>Noise decibel monitor present</p>
                                )}
                                {(listing as any).safety_items?.includes('exterior_security_camera') && (
                                    <p>Exterior security camera present</p>
                                )}
                            </div>
                        </div>

                        {/* Cancellation Policy */}
                        <div>
                            <h4 className="font-semibold mb-4">Cancellation policy</h4>
                            <div className="space-y-2 text-sm text-gray-700">
                                <p>Free cancellation for 48 hours.</p>
                                <p className="underline cursor-pointer">Learn more</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Date Picker Modal */}
            {showDatePicker && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-semibold mb-2">Select dates</h2>
                            <p className="text-gray-600">Add your travel dates for exact pricing</p>
                        </div>

                        {/* Date Input Fields */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-gray-700 mb-2">
                                        Check-in
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="MM/DD/YYYY"
                                        value={checkInDate ? checkInDate.toLocaleDateString('en-US') : ''}
                                        onChange={(e) => {
                                            const date = new Date(e.target.value);
                                            if (!isNaN(date.getTime())) {
                                                setCheckInDate(date);
                                            }
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-gray-700 mb-2">
                                        Checkout
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Add date"
                                        value={checkOutDate ? checkOutDate.toLocaleDateString('en-US') : ''}
                                        onChange={(e) => {
                                            const date = new Date(e.target.value);
                                            if (!isNaN(date.getTime())) {
                                                setCheckOutDate(date);
                                            }
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                        disabled={!checkInDate}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dual Calendar View */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Current Month */}
                                <div>
                                    {(() => {
                                        const monthDate = new Date(currentMonth);
                                        const daysInMonth = getDaysInMonth(monthDate);
                                        const firstDay = getFirstDayOfMonth(monthDate);
                                        const days = [];
                                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

                                        return (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <button
                                                        onClick={prevMonth}
                                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                                    >
                                                        <ChevronLeft className="h-5 w-5" />
                                                    </button>
                                                    <h3 className="text-lg font-semibold">
                                                        {monthNames[monthDate.getMonth()]} {monthDate.getFullYear()}
                                                    </h3>
                                                    <div className="w-9" /> {/* Spacer */}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1 mb-2">
                                                    {dayNames.map(day => (
                                                        <div key={day} className="h-10 flex items-center justify-center text-xs font-semibold text-gray-600">
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {Array.from({ length: firstDay }).map((_, i) => (
                                                        <div key={`empty-${i}`} className="h-10" />
                                                    ))}
                                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                                        const day = i + 1;
                                                        const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                                                        const isCheckIn = isSameDay(checkInDate, date);
                                                        const isCheckOut = isSameDay(checkOutDate, date);
                                                        const inRange = isInRange(date);
                                                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                                                        return (
                                                            <button
                                                                key={day}
                                                                onClick={() => !isPast && handleDateClick(date)}
                                                                disabled={isPast}
                                                                className={`h-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                                                                    ${isPast ? 'text-gray-300 cursor-not-allowed line-through' : 'hover:border hover:border-gray-900'}
                                                                    ${isCheckIn || isCheckOut ? 'bg-gray-900 text-white' : ''}
                                                                    ${inRange ? 'bg-gray-100' : ''}
                                                                    ${!isPast && !isCheckIn && !isCheckOut && !inRange ? 'text-gray-900' : ''}
                                                                `}
                                                            >
                                                                {day}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Next Month */}
                                <div>
                                    {(() => {
                                        const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
                                        const daysInMonth = getDaysInMonth(monthDate);
                                        const firstDay = getFirstDayOfMonth(monthDate);
                                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

                                        return (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="w-9" /> {/* Spacer */}
                                                    <h3 className="text-lg font-semibold">
                                                        {monthNames[monthDate.getMonth()]} {monthDate.getFullYear()}
                                                    </h3>
                                                    <button
                                                        onClick={nextMonth}
                                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                                    >
                                                        <ChevronRight className="h-5 w-5" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-7 gap-1 mb-2">
                                                    {dayNames.map(day => (
                                                        <div key={day} className="h-10 flex items-center justify-center text-xs font-semibold text-gray-600">
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {Array.from({ length: firstDay }).map((_, i) => (
                                                        <div key={`empty-${i}`} className="h-10" />
                                                    ))}
                                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                                        const day = i + 1;
                                                        const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                                                        const isCheckIn = isSameDay(checkInDate, date);
                                                        const isCheckOut = isSameDay(checkOutDate, date);
                                                        const inRange = isInRange(date);
                                                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                                                        return (
                                                            <button
                                                                key={day}
                                                                onClick={() => !isPast && handleDateClick(date)}
                                                                disabled={isPast}
                                                                className={`h-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                                                                    ${isPast ? 'text-gray-300 cursor-not-allowed line-through' : 'hover:border hover:border-gray-900'}
                                                                    ${isCheckIn || isCheckOut ? 'bg-gray-900 text-white' : ''}
                                                                    ${inRange ? 'bg-gray-100' : ''}
                                                                    ${!isPast && !isCheckIn && !isCheckOut && !inRange ? 'text-gray-900' : ''}
                                                                `}
                                                            >
                                                                {day}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    setCheckInDate(null);
                                    setCheckOutDate(null);
                                }}
                                className="text-sm font-semibold underline hover:text-gray-600 transition-colors"
                            >
                                Clear dates
                            </button>
                            <button
                                onClick={() => setShowDatePicker(false)}
                                className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Gallery Lightbox */}
            {showPhotoGallery && listing.photos.length > 0 && (
                <div className="fixed inset-0 bg-white z-[60] flex flex-col">
                    {/* Gallery Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <button
                            onClick={() => setShowPhotoGallery(false)}
                            className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                            <span className="font-medium">Close</span>
                        </button>
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
                                <Share className="h-5 w-5" />
                                <span className="font-medium">Share</span>
                            </button>
                            <button className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
                                <Heart className="h-5 w-5" />
                                <span className="font-medium">Save</span>
                            </button>
                        </div>
                    </div>

                    {/* Gallery Content */}
                    {selectedPhotoIndex === -1 ? (
                        /* Grid View */
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="max-w-7xl mx-auto">
                                <h2 className="text-gray-900 text-2xl font-semibold mb-6">
                                    All photos ({listing.photos.length})
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {listing.photos.map((photo, index) => (
                                        <button
                                            key={photo.id}
                                            onClick={() => setSelectedPhotoIndex(index)}
                                            className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                                        >
                                            <img
                                                src={getImageUrl(photo.url)}
                                                alt={photo.caption || `Photo ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Single Photo View */
                        <div className="flex-1 flex items-center justify-center relative">
                            {/* Photo Counter */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-gray-900 font-medium">
                                {selectedPhotoIndex + 1} / {listing.photos.length}
                            </div>

                            {/* Previous Button */}
                            {selectedPhotoIndex > 0 && (
                                <button
                                    onClick={() => setSelectedPhotoIndex(selectedPhotoIndex - 1)}
                                    className="absolute left-4 p-3 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                            )}

                            {/* Photo */}
                            <div className="max-w-6xl max-h-[80vh] flex items-center justify-center">
                                <img
                                    src={getImageUrl(listing.photos[selectedPhotoIndex].url)}
                                    alt={listing.photos[selectedPhotoIndex].caption || `Photo ${selectedPhotoIndex + 1}`}
                                    className="max-w-full max-h-[80vh] object-contain"
                                />
                            </div>

                            {/* Next Button */}
                            {selectedPhotoIndex < listing.photos.length - 1 && (
                                <button
                                    onClick={() => setSelectedPhotoIndex(selectedPhotoIndex + 1)}
                                    className="absolute right-4 p-3 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                            )}

                            {/* Back to Grid Button */}
                            <button
                                onClick={() => setSelectedPhotoIndex(-1)}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                            >
                                Show all photos
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ListingPreview;
