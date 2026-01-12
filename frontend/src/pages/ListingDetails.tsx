import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getListing, createBooking } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Loader2, Share, Heart, Star, Minus, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { AMENITY_DETAILS } from '@/data/amenities';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import Footer from '@/components/Footer';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { addMonths, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, ShieldCheck, Award, Calendar as CalendarIcon, Map as MapIcon } from 'lucide-react';
import ReviewModal from '@/components/ReviewModal';
import ShareModal from '@/components/ShareModal';
import MessageHostModal from '@/components/MessageHostModal';
import ReportHostModal from '@/components/ReportHostModal';
import PhotoGallery from '@/components/PhotoGallery';
import { useToast } from '@/hooks/use-toast';


const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;


interface Review {
    id: number;
    user: {
        name: string;
        avatar: string;
    };
    ratings: Record<string, number>;
    comment: string;
    timestamp: string;
}

const ListingDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: product, isLoading, error } = useQuery({
        queryKey: ['listing', id],
        queryFn: () => getListing(id!),
        enabled: !!id,
    });

    const [checkInDate, setCheckInDate] = React.useState<Date | null>(null);
    const [checkOutDate, setCheckOutDate] = React.useState<Date | null>(null);
    const [adults, setAdults] = React.useState(1);
    const [children, setChildren] = React.useState(0);
    const [infants, setInfants] = React.useState(0);
    const [pets, setPets] = React.useState(0);
    const [showGuestPicker, setShowGuestPicker] = React.useState(false);
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [showDatePicker, setShowDatePicker] = React.useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = React.useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
    const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = React.useState(false);

    const [initialPhotoIndex, setInitialPhotoIndex] = React.useState(0);
    const [reviews, setReviews] = React.useState<Review[]>([]);
    const { toast } = useToast();

    type ReviewFormData = Pick<Review, "ratings" | "comment" | "timestamp">;
    const handleReviewSubmit = (reviewData: ReviewFormData) => {
        const newReview: Review = {
            id: Date.now(),
            user: {
                name: 'Guest User',
                avatar: 'https://github.com/shadcn.png'
            },
            ...reviewData
        };
        setReviews(prev => [newReview, ...prev]);
        setIsReviewModalOpen(false);
    };

    const sortedPhotos = React.useMemo(() => {
        if (!product?.photos) return [];
        return [...product.photos].sort((a, b) => (b.is_cover || 0) - (a.is_cover || 0));
    }, [product?.photos]);

    const disabledDays = React.useMemo(() => {
        if (!product?.unavailable_dates) return [];
        return product.unavailable_dates.map(range => ({
            from: new Date(range.check_in),
            to: new Date(range.check_out)
        }));
    }, [product?.unavailable_dates]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Listing not found</h1>
                <Button onClick={() => navigate('/')}>Go Home</Button>
            </div>
        );
    }

    const { listing, amenities } = product;
    const totalGuests = adults + children;



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

    const isDateDisabled = (date: Date) => {
        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
        if (isPast) return true;

        return disabledDays.some(range => {
            // Check if date falls within a booked range [check_in, check_out)
            // We use < range.to because check-out day is usually available for new check-in
            return date >= range.from && date < range.to;
        });
    };

    const handleDateClick = (date: Date) => {
        if (isDateDisabled(date)) return;

        if (!checkInDate || (checkInDate && checkOutDate)) {
            setCheckInDate(date);
            setCheckOutDate(null);
        } else {
            // If selecting check-out date, ensure no disabled dates in between
            if (date > checkInDate) {
                const hasDisabledInBetween = disabledDays.some(range =>
                    (range.from > checkInDate && range.from < date) ||
                    (range.to > checkInDate && range.to < date) ||
                    (range.from <= checkInDate && range.to >= date) // Should be covered by initial check but good to be safe
                );

                if (hasDisabledInBetween) {
                    toast({
                        title: 'Dates unavailable',
                        description: 'Selected range includes unavailable dates.',
                        variant: 'destructive'
                    });
                    return;
                }
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
            days.push(<div key={`empty-${i}`} className="h-10" />);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isCheckIn = isSameDay(checkInDate, date);
            const isCheckOut = isSameDay(checkOutDate, date);
            const inRange = isInRange(date);
            const disabled = isDateDisabled(date);

            days.push(
                <button
                    key={day}
                    onClick={() => !disabled && handleDateClick(date)}
                    disabled={disabled}
                    className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-medium transition-all
                        ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-900'}
                        ${isCheckIn || isCheckOut ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                        ${inRange && !isCheckIn && !isCheckOut ? 'bg-gray-100' : ''}
                    `}
                >
                    {day}
                </button>
            );
        }

        return (
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h4 className="text-base font-semibold">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h4>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Next month"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-3">
                    {dayNames.map(day => (
                        <div key={day} className="h-10 flex items-center justify-center text-xs font-medium text-gray-500">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>
        );
    };

    const handleReserve = async () => {
        if (!checkInDate || !checkOutDate) {
            setShowDatePicker(true);
            return;
        }

        const current = `${window.location.pathname}${window.location.search}`;
        const isLoggedIn = !!localStorage.getItem('userId');
        if (!isLoggedIn) {
            toast({
                title: 'Login required',
                description: 'Please log in to reserve a listing.',
                variant: 'destructive'
            });
            window.location.href = `/webauth-login?redirect=${encodeURIComponent(current || '/')}`;
            return;
        }

        try {
            await createBooking({
                listing_id: listing.id,
                check_in: format(checkInDate, 'yyyy-MM-dd'),
                check_out: format(checkOutDate, 'yyyy-MM-dd'),
                guests: totalGuests,
            });
            toast({
                title: 'Reservation successful',
                description: 'Your reservation request has been sent.'
            });
            navigate('/');
        } catch (error) {
            console.error("Failed to reserve:", error);
            toast({
                title: 'Reservation failed',
                description: 'Please try again.',
                variant: 'destructive'
            });
        }
    };

    // Parse house rules
    let houseRules = null;
    try {
        houseRules = listing.house_rules ? JSON.parse(listing.house_rules) : null;
    } catch (e) {
        console.error('Failed to parse house rules:', e);
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Title and Actions */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">{listing.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">★ New</span>
                            <span>•</span>
                            <span className="underline">{listing.city}, {listing.country}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsShareModalOpen(true)}
                        >
                            <Share className="h-4 w-4" />
                            Share
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Heart className="h-4 w-4" />
                            Save
                        </Button>
                    </div>
                </div>

                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    listing={{ ...listing, photos: sortedPhotos }}
                />

                <MessageHostModal
                    isOpen={isMessageModalOpen}
                    onClose={() => setIsMessageModalOpen(false)}
                    listingId={listing.id}
                    hostId={listing.host_id}
                    hostName="Host" // TODO: Get actual host name
                />

                <ReportHostModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    hostId={listing.host_id}
                    listingId={listing.id}
                />

                <PhotoGallery

                    isOpen={isPhotoGalleryOpen}
                    onClose={() => setIsPhotoGalleryOpen(false)}
                    photos={sortedPhotos}
                    initialPhotoIndex={initialPhotoIndex}
                />

                {/* Photo Gallery */}
                <div className="mb-8 rounded-xl overflow-hidden shadow-sm">
                    {sortedPhotos.length > 0 ? (
                        <div className="relative group">
                            {sortedPhotos.length === 1 ? (
                                <img
                                    src={getImageUrl(sortedPhotos[0].url)}
                                    alt={listing.title}
                                    className="w-full h-[300px] sm:h-[400px] md:h-[500px] object-cover cursor-pointer hover:scale-105 transition-transform duration-700"
                                    onClick={() => {
                                        setInitialPhotoIndex(0);
                                        setIsPhotoGalleryOpen(true);
                                    }}
                                />
                            ) : sortedPhotos.length <= 4 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {sortedPhotos.slice(0, 4).map((photo, idx) => (
                                        <div
                                            key={photo.id}
                                            className={`relative overflow-hidden cursor-pointer ${idx === 0 ? 'sm:col-span-2 h-[300px] sm:h-[400px]' : 'h-[200px] sm:h-[250px]'}`}
                                            onClick={() => {
                                                setInitialPhotoIndex(idx);
                                                setIsPhotoGalleryOpen(true);
                                            }}
                                        >
                                            <img
                                                src={getImageUrl(photo.url)}
                                                alt={`Photo ${idx + 1}`}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[300px] md:h-[450px]">
                                    <div
                                        className="md:col-span-2 md:row-span-2 relative cursor-pointer overflow-hidden h-full"
                                        onClick={() => {
                                            setInitialPhotoIndex(0);
                                            setIsPhotoGalleryOpen(true);
                                        }}
                                    >
                                        <img
                                            src={getImageUrl(sortedPhotos[0].url)}
                                            alt={listing.title}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="hidden md:grid md:col-span-2 md:grid-cols-2 md:grid-rows-2 gap-2 h-full">
                                        {sortedPhotos.slice(1, 5).map((photo, idx) => (
                                            <div
                                                key={photo.id}
                                                className="relative cursor-pointer overflow-hidden h-full"
                                                onClick={() => {
                                                    setInitialPhotoIndex(idx + 1);
                                                    setIsPhotoGalleryOpen(true);
                                                }}
                                            >
                                                <img
                                                    src={getImageUrl(photo.url)}
                                                    alt={`Photo ${idx + 2}`}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button
                                className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-black/10 font-medium text-sm hover:bg-white hover:scale-105 transition-all shadow-sm flex items-center gap-2"
                                onClick={() => {
                                    setInitialPhotoIndex(0);
                                    setIsPhotoGalleryOpen(true);
                                }}
                            >
                                <span className="hidden sm:inline">Show all photos</span>
                                <span className="sm:hidden">Photos</span>
                            </button>
                        </div>
                    ) : (
                        <div className="w-full h-64 md:h-[400px] bg-muted flex items-center justify-center rounded-xl">
                            <p className="text-muted-foreground">No photos available</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Left Column: Details */}
                    <div className="md:col-span-2">
                        <div className="border-b pb-6 mb-6">
                            <h2 className="text-xl font-semibold mb-1">
                                {listing.property_type} hosted by Host
                            </h2>
                            <p className="text-muted-foreground">
                                {listing.max_guests} guests • {listing.bedrooms} bedrooms • {listing.beds} beds • {listing.bathrooms} baths
                            </p>
                        </div>

                        {/* Description */}
                        <div className="border-b pb-6 mb-6">
                            <h3 className="font-semibold mb-4">About this place</h3>
                            <p className="text-muted-foreground whitespace-pre-line">{listing.description}</p>
                        </div>

                        {/* Amenities */}
                        <div className="border-b pb-6 mb-6">
                            <h3 className="font-semibold mb-4">What this place offers</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {amenities.slice(0, 10).map((amenityKey) => {
                                    const amenity = AMENITY_DETAILS[amenityKey];
                                    if (!amenity) return null;
                                    const Icon = amenity.icon;
                                    return (
                                        <div key={amenityKey} className="flex items-center gap-3">
                                            <Icon className="h-6 w-6 text-gray-700" />
                                            <span className="text-gray-900">{amenity.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {amenities.length > 10 && (
                                <Button variant="outline" className="mt-6">
                                    Show all {amenities.length} amenities
                                </Button>
                            )}
                        </div>

                        {/* Inline Calendar Section */}
                        <div className="border-b pb-12 mb-12">
                            <h3 className="text-xl font-semibold mb-2">
                                {checkInDate && checkOutDate
                                    ? `${Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights in ${listing.city}`
                                    : `Select check-in date`}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {checkInDate && checkOutDate
                                    ? `${format(checkInDate, 'MMM d, yyyy')} - ${format(checkOutDate, 'MMM d, yyyy')}`
                                    : 'Add your travel dates for exact pricing'}
                            </p>
                            <div className="hidden md:block">
                                <DayPicker
                                    mode="range"
                                    selected={checkInDate ? { from: checkInDate, to: checkOutDate || undefined } : undefined}
                                    onSelect={(range: DateRange | undefined) => {
                                        if (range?.from) setCheckInDate(range.from);
                                        setCheckOutDate(range?.to || null);
                                        if (!range) {
                                            setCheckInDate(null);
                                            setCheckOutDate(null);
                                        }
                                    }}
                                    numberOfMonths={2}
                                    pagedNavigation
                                    disabled={[
                                        { before: new Date() },
                                        ...disabledDays
                                    ]}
                                    modifiersStyles={{
                                        selected: { backgroundColor: '#222222', color: 'white' },
                                        range_middle: { backgroundColor: '#F7F7F7', color: '#222222' },
                                        range_start: { backgroundColor: '#222222', color: 'white' },
                                        range_end: { backgroundColor: '#222222', color: 'white' }
                                    }}
                                    className="border-0"
                                />
                            </div>
                            <div className="md:hidden flex justify-center">
                                <DayPicker
                                    mode="range"
                                    selected={checkInDate ? { from: checkInDate, to: checkOutDate || undefined } : undefined}
                                    onSelect={(range: DateRange | undefined) => {
                                        if (range?.from) setCheckInDate(range.from);
                                        setCheckOutDate(range?.to || null);
                                        if (!range) {
                                            setCheckInDate(null);
                                            setCheckOutDate(null);
                                        }
                                    }}
                                    numberOfMonths={1}
                                    disabled={[
                                        { before: new Date() },
                                        ...disabledDays
                                    ]}
                                    modifiersStyles={{
                                        selected: { backgroundColor: '#222222', color: 'white' },
                                        range_middle: { backgroundColor: '#F7F7F7', color: '#222222' },
                                        range_start: { backgroundColor: '#222222', color: 'white' },
                                        range_end: { backgroundColor: '#222222', color: 'white' }
                                    }}
                                />
                            </div>
                            <div className="flex justify-end mt-4">
                                <Button
                                    variant="ghost"
                                    className="underline font-semibold"
                                    onClick={() => {
                                        setCheckInDate(null);
                                        setCheckOutDate(null);
                                    }}
                                >
                                    Clear dates
                                </Button>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="border-b pb-12 mb-12">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <Star className="h-5 w-5 fill-current" />
                                    <h2 className="text-2xl font-semibold">
                                        {reviews.length === 0 ? 'No reviews yet' : `${(reviews.reduce((acc, r) => acc + Object.values(r.ratings).reduce((a, b) => a + b, 0) / 6, 0) / reviews.length).toFixed(2)} · ${reviews.length} reviews`}
                                    </h2>
                                </div>
                                <Button variant="outline" onClick={() => setIsReviewModalOpen(true)}>Write a Review</Button>
                            </div>

                            <ReviewModal
                                isOpen={isReviewModalOpen}
                                onClose={() => setIsReviewModalOpen(false)}
                                onSubmit={handleReviewSubmit}
                            />

                            {reviews.length > 0 && (
                                <>
                                    {/* Rating Breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
                                        {['cleanliness', 'accuracy', 'checkin', 'communication', 'location', 'value'].map((category) => {
                                            const categoryAvg = reviews.reduce((acc, r) => acc + r.ratings[category], 0) / reviews.length;
                                            return (
                                                <div key={category} className="flex items-center justify-between">
                                                    <span className="text-sm md:text-base capitalize">{category === 'checkin' ? 'Check-in' : category}</span>
                                                    <div className="flex items-center gap-3 w-1/2">
                                                        <Progress value={categoryAvg * 20} className="h-1" />
                                                        <span className="text-xs font-semibold">{categoryAvg.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Reviews List */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {reviews.map((review) => (
                                            <div key={review.id}>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={review.user.avatar} />
                                                        <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-semibold">{review.user.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {new Date(review.timestamp).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-muted-foreground line-clamp-3">
                                                    {review.comment}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Booking Card */}
                    <div className="relative hidden md:block">
                        <div className="sticky top-24 border rounded-xl p-6 shadow-lg bg-white">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <span className="text-2xl font-bold">
                                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(listing.price_per_night || 0)}
                                    </span>
                                    <span className="text-muted-foreground"> / night</span>
                                </div>
                            </div>

                            <div className="border rounded-lg mb-4">
                                <div className="grid grid-cols-2 border-b">
                                    <div className="p-3 border-r cursor-pointer hover:bg-gray-50" onClick={() => setShowDatePicker(!showDatePicker)}>
                                        <div className="text-[10px] font-bold uppercase">Check-in</div>
                                        <div className="text-sm">{checkInDate ? checkInDate.toLocaleDateString() : 'Add date'}</div>
                                    </div>
                                    <div className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => setShowDatePicker(!showDatePicker)}>
                                        <div className="text-[10px] font-bold uppercase">Checkout</div>
                                        <div className="text-sm">{checkOutDate ? checkOutDate.toLocaleDateString() : 'Add date'}</div>
                                    </div>
                                </div>
                                <div className="p-3 relative">
                                    <div className="cursor-pointer" onClick={() => setShowGuestPicker(!showGuestPicker)}>
                                        <div className="text-[10px] font-bold uppercase">Guests</div>
                                        <div className="text-sm">{totalGuests} guest{totalGuests !== 1 ? 's' : ''}</div>
                                    </div>

                                    {showGuestPicker && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 w-80">
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
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${adults <= 1 ? 'border-gray-200 text-gray-300' : 'border-gray-400 text-gray-600'}`}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-medium">{adults}</span>
                                                    <button
                                                        onClick={() => setAdults(adults + 1)}
                                                        className="w-8 h-8 rounded-full border border-gray-400 text-gray-600 flex items-center justify-center"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <Button variant="ghost" className="w-full mt-2" onClick={() => setShowGuestPicker(false)}>Close</Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {showDatePicker && (
                                <div className="mb-4">
                                    {renderCalendar()}
                                </div>
                            )}

                            <Button
                                className="w-full bg-[#FF385C] hover:bg-[#D9324E] text-white font-semibold py-6 text-lg"
                                onClick={handleReserve}
                            >
                                Reserve
                            </Button>

                            <div className="text-center mt-4 text-sm text-muted-foreground">
                                You won't be charged yet
                            </div>
                        </div>
                    </div>
                </div>

                {/* Where you'll be */}
                <div className="py-8 border-t border-gray-200">
                    <h3 className="text-xl font-semibold mb-4">Where you'll be</h3>
                    <div className="mb-6">
                        <p className="font-medium text-gray-900 text-lg">{listing.address || `${listing.city}, ${listing.country}`}</p>
                        {(listing.latitude && listing.longitude) && (
                            <p className="text-gray-500 mt-1">
                                {listing.latitude}, {listing.longitude}
                            </p>
                        )}
                    </div>
                    <div className="h-64 md:h-[400px] rounded-xl overflow-hidden z-0 relative">
                        <MapContainer
                            center={[listing.latitude || 4.0511, listing.longitude || 9.7679]}
                            zoom={13}
                            scrollWheelZoom={false}
                            className="h-full w-full"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[listing.latitude || 4.0511, listing.longitude || 9.7679]}>
                                <Popup>
                                    <div className="font-semibold">{listing.title}</div>
                                    <div className="text-sm text-gray-600">Exact location provided after booking</div>
                                </Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                </div>

                {/* Location Details: Getting around & Scenic views */}
                {(listing.getting_around || (listing.scenic_views && listing.scenic_views.length > 0)) && (
                    <div className="py-8 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {listing.getting_around && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-4">Getting around</h3>
                                    <p className="text-muted-foreground whitespace-pre-line">
                                        {listing.getting_around}
                                    </p>
                                </div>
                            )}

                            {listing.scenic_views && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-4">Scenic views</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            try {
                                                const views = typeof listing.scenic_views === 'string'
                                                    ? JSON.parse(listing.scenic_views)
                                                    : listing.scenic_views;

                                                if (Array.isArray(views)) {
                                                    return views.map((view: string, index: number) => (
                                                        <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                                                            {view}
                                                        </div>
                                                    ));
                                                }
                                                return null;
                                            } catch (e) {
                                                return null;
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Host Section */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-semibold mb-6">Meet your Host</h3>
                    <div className="bg-[#F0EFE9] rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Host Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg flex flex-col items-center text-center md:col-span-1">
                            <div className="relative mb-4">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={localStorage.getItem('host_avatar') || "https://github.com/shadcn.png"} />
                                    <AvatarFallback>HO</AvatarFallback>
                                </Avatar>
                                {/* Removed Superhost badge as we don't have this data yet */}
                            </div>
                            <h4 className="text-2xl font-bold mb-1">Host</h4>
                            {/* Removed Superhost label */}

                            <div className="w-full space-y-4 mt-4">
                                <div className="flex justify-between items-center border-b pb-4">
                                    <div className="text-left">
                                        <div className="font-bold text-lg">{reviews.length}</div>
                                        <div className="text-xs text-muted-foreground">Reviews</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">
                                            {reviews.length > 0
                                                ? (reviews.reduce((acc, r) => acc + Object.values(r.ratings).reduce((a, b) => a + b, 0) / 6, 0) / reviews.length).toFixed(2)
                                                : "New"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Rating</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">New</div>
                                        <div className="text-xs text-muted-foreground">Years hosting</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Host Details */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Removed fake badges (Superhost, Response rate, Free cancellation) */}

                            <div className="pt-4">
                                <h4 className="text-lg font-semibold mb-2">About the Host</h4>
                                {localStorage.getItem('host_location') && (
                                    <div className="flex items-center gap-2 mb-2 text-gray-700">
                                        <MapIcon className="h-5 w-5" />
                                        <span>Lives in {localStorage.getItem('host_location')}</span>
                                    </div>
                                )}
                                {localStorage.getItem('host_languages') && (
                                    <div className="flex items-center gap-2 mb-4 text-gray-700">
                                        <MessageSquare className="h-5 w-5" />
                                        <span>Speaks {localStorage.getItem('host_languages')}</span>
                                    </div>
                                )}
                                <p className="text-muted-foreground mb-6">
                                    I am a passionate traveler and I love hosting people from all over the world. My goal is to make your stay as comfortable as possible.
                                </p>
                                <Button
                                    variant="outline"
                                    className="font-semibold border-black text-black hover:bg-gray-100"
                                    onClick={() => setIsMessageModalOpen(true)}
                                >
                                    Message Host
                                </Button>
                                <div className="mt-4 flex justify-center md:justify-start">
                                    <button
                                        onClick={() => setIsReportModalOpen(true)}
                                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground underline"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        Report this host
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Things to know */}
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
                                {listing.safety_devices && (() => {
                                    let devices: string[] = [];
                                    try {
                                        // Try to parse as JSON first
                                        if (listing.safety_devices.trim().startsWith('[')) {
                                            devices = JSON.parse(listing.safety_devices);
                                        } else {
                                            // Fallback to comma-separated
                                            devices = listing.safety_devices.split(',');
                                        }
                                    } catch (e) {
                                        // Fallback if not JSON
                                        devices = [listing.safety_devices];
                                    }
                                    return devices.map((device, index) => (
                                        <p key={index}>{device}</p>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Cancellation Policy */}
                        <div>
                            <h4 className="font-semibold mb-4">Cancellation policy</h4>
                            <p className="text-sm text-gray-700">
                                {listing.cancellation_policy || "Flexible cancellation policy"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Booking Bar */}
            <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 p-4 md:hidden pb-safe">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-lg">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(listing.price_per_night || 0)}
                            </span>
                            <span className="text-sm text-muted-foreground">/ night</span>
                        </div>
                        <span className="text-xs font-medium underline cursor-pointer">
                            {checkInDate && checkOutDate ?
                                `${format(checkInDate, 'MMM d')} - ${format(checkOutDate, 'MMM d')}` :
                                'Add dates'
                            }
                        </span>
                    </div>
                    <Button
                        className="bg-[#FF385C] hover:bg-[#D9324E] text-white font-semibold px-8"
                        onClick={() => {
                            // Scroll to calendar
                            document.querySelector('.rdp')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                    >
                        Reserve
                    </Button>
                </div>
            </div>


            <Footer />
        </div >
    );
};

export default ListingDetails;
