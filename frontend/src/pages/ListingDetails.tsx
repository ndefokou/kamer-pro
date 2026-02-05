import React, { Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getListingFresh as getListing, createBooking, getListingReviews, addListingReview, ListingReview } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Loader2, Share, Heart, Star, Minus, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Loading from '@/components/Loading';
import { getImageUrl, formatPrice } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';
import { openWhatsApp } from '@/lib/whatsapp';
import { AMENITY_DETAILS } from '@/data/amenities';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { addMonths, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, ShieldCheck, Award, Calendar as CalendarIcon, Map as MapIcon } from 'lucide-react';
const ReviewModal = lazy(() => import('@/components/ReviewModal'));
import { DEFAULT_HOUSE_RULES, type HouseRules } from '@/components/host/HouseRulesSection';
const ShareModal = lazy(() => import('@/components/ShareModal'));
const MessageHostModal = lazy(() => import('@/components/MessageHostModal'));
const ReportHostModal = lazy(() => import('@/components/ReportHostModal'));
const PhotoGallery = lazy(() => import('@/components/PhotoGallery'));
import SEO from '@/components/SEO';
import { useToast } from '@/hooks/use-toast';
import { useWishlist } from '@/hooks/useWishlist';
import { useTranslation } from 'react-i18next';
import TranslatedText from '@/components/TranslatedText';
import { useConnectionQuality } from '@/services/networkService';
import { propertyTypes } from '@/data/propertyTypes';


const ListingMap = lazy(() => import("@/components/Map/ListingMap"));


interface Review {
    id: number;
    user: {
        name: string;
        avatar: string;
    };
    guestId?: number;
    ratings: Record<string, number>;
    comment: string;
    timestamp: string;
}

const ListingDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToWishlist, removeFromWishlistByProduct, isInWishlist } = useWishlist();

    const { data: product, isLoading, error, refetch } = useQuery({
        queryKey: ['listing', id],
        queryFn: () => getListing(id!),
        enabled: !!id,
    });

    // Live updates: listen for host calendar availability changes and refetch if this listing was updated
    React.useEffect(() => {
        if (!id) return;
        let bc: BroadcastChannel | null = null;

        const onWindowEvent = (e: Event) => {
            const detail = (e as CustomEvent).detail as { listingId?: string } | undefined;
            if (detail?.listingId === id) {
                refetch();
            }
        };

        try {
            // Cross-tab channel
            if ('BroadcastChannel' in window) {
                bc = new BroadcastChannel('calendar-updates');
                bc.onmessage = (msg: MessageEvent) => {
                    const data = msg.data as { type?: string; listingId?: string };
                    if (data?.type === 'calendar_updated' && data.listingId === id) {
                        refetch();
                    }
                };
            }
        } catch { /* noop */ }

        // Intra-tab event
        window.addEventListener('calendar_updated', onWindowEvent as EventListener);

        return () => {
            window.removeEventListener('calendar_updated', onWindowEvent as EventListener);
            try { bc?.close(); } catch { /* noop */ }
        };
    }, [id, refetch]);


    const [checkInDate, setCheckInDate] = React.useState<Date | null>(null);
    const [checkOutDate, setCheckOutDate] = React.useState<Date | null>(null);
    const [adults, setAdults] = React.useState(1);
    const [children, setChildren] = React.useState(0);
    const [infants, setInfants] = React.useState(0);
    const [pets, setPets] = React.useState(0);
    const [showGuestPicker, setShowGuestPicker] = React.useState(false);
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [showDatePicker, setShowDatePicker] = React.useState(false); // desktop inline calendar
    const [showDatePickerMobile, setShowDatePickerMobile] = React.useState(false); // mobile dialog
    const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = React.useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
    const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = React.useState(false);
    const { t, i18n } = useTranslation();
    const localeSelection = i18n.language === 'fr' ? fr : enUS;
    const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';

    const [initialPhotoIndex, setInitialPhotoIndex] = React.useState(0);
    const [reviews, setReviews] = React.useState<Review[]>([]);
    const { toast } = useToast();
    const closeBtnRef = React.useRef<HTMLButtonElement>(null);
    const desktopCalRef = React.useRef<HTMLDivElement>(null);
    const mapContainerRef = React.useRef<HTMLDivElement>(null);

    const { isSlowConnection } = useConnectionQuality();
    const [showMap, setShowMap] = React.useState(!isSlowConnection);

    // Automatically load map when it comes into view
    React.useEffect(() => {
        if (showMap || !mapContainerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setShowMap(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '100px', // Start loading 100px before the map comes into view
                threshold: 0.1,
            }
        );

        observer.observe(mapContainerRef.current);

        return () => {
            observer.disconnect();
        };
    }, [showMap]);

    const openMobileDatePicker = () => {
        try {
            (document.activeElement as HTMLElement | null)?.blur?.();
        } catch { /* noop */ }
        setShowDatePickerMobile(true);
    };

    // Map backend review row to UI Review
    const mapRowToReview = React.useCallback((row: ListingReview): Review => {
        let parsedRatings: Record<string, number> = { cleanliness: 5, accuracy: 5, checkin: 5, communication: 5, location: 5, value: 5 };
        try {
            if (row.ratings && typeof row.ratings === 'string') parsedRatings = JSON.parse(row.ratings);
            if (row.ratings && typeof row.ratings === 'object') parsedRatings = row.ratings as Record<string, number>;
        } catch { /* keep defaults */ }
        return {
            id: Number(row.id),
            user: {
                name: row.username || 'Guest',
                avatar: row.avatar || 'https://github.com/shadcn.png',
            },
            guestId: Number(row.guest_id),
            ratings: parsedRatings,
            comment: row.comment || '',
            timestamp: row.created_at || new Date().toISOString(),
        };
    }, []);

    // Load reviews from backend
    React.useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const rows = await getListingReviews(id);
                setReviews(rows.map(mapRowToReview));
            } catch (e) {
                // silent fail in UI
                console.error('Failed to load reviews', e);
            }
        };
        load();
    }, [id, mapRowToReview]);

    type ReviewFormData = Pick<Review, 'ratings' | 'comment' | 'timestamp'>;
    const handleReviewSubmit = async (reviewData: ReviewFormData) => {
        if (!id) return;
        try {
            const saved = await addListingReview(id, { ratings: reviewData.ratings, comment: reviewData.comment });
            const ui = mapRowToReview(saved);
            setReviews(prev => [ui, ...prev]);
            setIsReviewModalOpen(false);
            toast({ title: t('Success'), description: t('Thank you for your feedback!') });
        } catch (error: unknown) {
            console.error('Failed to submit review', error);
            const err = error as { response?: { status?: number } };
            const status = err.response?.status;
            if (status === 409) {
                setIsReviewModalOpen(false);
                toast({ title: t('Already reviewed'), description: t('You can only review this listing once.'), variant: 'destructive' });
                return;
            }
            if (status === 401) {
                toast({ title: t('Login required'), description: t('Please log in to write a review.'), variant: 'destructive' });
                const current = `${window.location.pathname}${window.location.search}`;
                window.location.href = `/login?redirect=${encodeURIComponent(current || '/')}`;
                return;
            }
            toast({ title: t('Failed to submit review'), description: t('Please try again later.'), variant: 'destructive' });
        }
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
        return <Loading fullScreen message={t('common.loading', 'Loading...')} />;
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">{t('listing.errors.notFound')}</h1>
                <Button onClick={() => navigate('/')}>{t('listing.actions.goHome')}</Button>
            </div>
        );
    }

    const { listing, amenities } = product;
    const hostName = (product.host_username || '').trim() || 'Host';
    const hostAvatar = product.host_avatar ?? localStorage.getItem('host_avatar') ?? undefined;
    const totalGuests = adults + children;
    const isHost = Number(localStorage.getItem('userId')) === listing.host_id;
    const currentUserId = Number(localStorage.getItem('userId') || '') || null;

    const isWishlisted = isInWishlist(listing.id);
    const hasReviewed = !!currentUserId && reviews.some(r => r.guestId === currentUserId);

    // Calculate booking price
    const numberOfNights = checkInDate && checkOutDate
        ? Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const subtotal = numberOfNights * (listing.price_per_night || 0);
    const serviceFee = 0; // Can be updated later if needed
    const totalPrice = subtotal + serviceFee;

    const handleToggleWishlist = () => {
        if (!id) return;
        const productId = id;
        if (isWishlisted) {
            removeFromWishlistByProduct(productId);
        } else {
            addToWishlist(productId);
        }
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
        const monthNames = t('common.months', { returnObjects: true }) as string[];
        const dayNames = t('common.daysMin', { returnObjects: true }) as string[];

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
                        aria-label={t('common.back')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h4 className="text-base font-semibold">
                        {new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(currentMonth)}
                    </h4>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label={t('common.next')}
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
        if (isHost) {
            toast({
                title: 'Not allowed',
                description: 'You cannot reserve your own listing.',
                variant: 'destructive'
            });
            return;
        }
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
            window.location.href = `/login?redirect=${encodeURIComponent(current || '/')}`;
            return;
        }

        // Enforce host's maximum guests condition on the client as well
        if ((listing.max_guests || 0) > 0 && totalGuests > (listing.max_guests || 0)) {
            toast({
                title: 'Too many guests',
                description: `This place allows up to ${listing.max_guests} guests. Reduce the number of guests to continue.`,
                variant: 'destructive'
            });
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
            navigate('/bookings');
        } catch (error) {
            console.error("Failed to reserve:", error);
            toast({
                title: 'Reservation failed',
                description: 'Please try again.',
                variant: 'destructive'
            });
        }
    };

    const handleMessageHost = () => {
        const phone = product?.contact_phone;
        const success = openWhatsApp(phone, t('listing.actions.whatsappGreeting', { name: hostName }));

        if (!success) {
            setIsMessageModalOpen(true);
        }
    };

    // Parse house rules (default to all disallowed)
    let houseRules: HouseRules = DEFAULT_HOUSE_RULES;
    try {
        houseRules = listing.house_rules ? JSON.parse(listing.house_rules) : DEFAULT_HOUSE_RULES;
    } catch (e) {
        console.error('Failed to parse house rules:', e);
        houseRules = DEFAULT_HOUSE_RULES;
    }
    let aboutSections: { title: string; text: string }[] = [];
    let aboutPlain: string | null = listing.description || null;
    try {
        if (listing.description && listing.description.trim().startsWith('{')) {
            const desc = JSON.parse(listing.description);
            const pairs: Array<[string, string]> = [
                ['listingDescription', t('listing.details.about')],
                ['propertyDetails', t('propertyDetails')],
                ['guestAccess', t('guestAccess')],
                ['guestInteraction', t('guestInteraction')],
                ['otherNotes', t('otherNotes')],
                ['otherDetails', t('otherDetails')],
            ];
            aboutSections = pairs
                .map(([key, title]) => ({ title, text: typeof desc[key] === 'string' ? desc[key].trim() : '' }))
                .filter(s => s.text);
            if (aboutSections.length > 0) aboutPlain = null;
        }
    } catch (e) {
        aboutSections = [];
        aboutPlain = listing.description || null;
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <SEO
                title={listing.title || t('listing.details.untitled')}
                description={listing.description?.substring(0, 160) || t('listing.details.seoDescription')}
                image={sortedPhotos[0] ? getImageUrl(sortedPhotos[0].url) : undefined}
                type="article"
            />
            {/* Site Header */}
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Title and Actions */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold mb-2"><TranslatedText as="span" text={listing.title} /></h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">★ {t('listing.details.new')}</span>
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
                            {t('listing.actions.share')}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={handleToggleWishlist}>
                            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-green-600 text-green-600' : ''}`} />
                            {t('listing.actions.save')}
                        </Button>
                    </div>
                </div>

                <Suspense fallback={null}>
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        listing={{ ...listing, photos: sortedPhotos }}
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <MessageHostModal
                        isOpen={isMessageModalOpen}
                        onClose={() => setIsMessageModalOpen(false)}
                        listingId={listing.id}
                        hostId={listing.host_id}
                        hostName={hostName} // TODO: Get actual host name
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <ReportHostModal
                        isOpen={isReportModalOpen}
                        onClose={() => setIsReportModalOpen(false)}
                        hostId={listing.host_id}
                        listingId={listing.id}
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <PhotoGallery
                        isOpen={isPhotoGalleryOpen}
                        onClose={() => setIsPhotoGalleryOpen(false)}
                        photos={sortedPhotos}
                        initialPhotoIndex={initialPhotoIndex}
                    />
                </Suspense>

                {/* Photo Gallery */}
                <div className="mb-8 rounded-xl overflow-hidden shadow-sm">
                    {sortedPhotos.length > 0 ? (
                        <div className="relative group">
                            {sortedPhotos.length === 1 ? (
                                <OptimizedImage
                                    src={getImageUrl(sortedPhotos[0].url)}
                                    alt={listing.title}
                                    className="w-full h-[300px] sm:h-[400px] md:h-[500px] object-cover cursor-pointer hover:scale-105 transition-transform duration-700"
                                    onClick={() => {
                                        setInitialPhotoIndex(0);
                                        setIsPhotoGalleryOpen(true);
                                    }}
                                    priority={true}
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
                                            <OptimizedImage
                                                src={getImageUrl(photo.url)}
                                                alt={`Photo ${idx + 1}`}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                                quality={idx === 0 ? 'high' : 'medium'}
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
                                        <OptimizedImage
                                            src={getImageUrl(sortedPhotos[0].url)}
                                            alt={listing.title}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                            quality="high"
                                            priority={true}
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
                                                <OptimizedImage
                                                    src={getImageUrl(photo.url)}
                                                    alt={`Photo ${idx + 2}`}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                                    quality="medium"
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
                                <span className="hidden sm:inline">{t('listing.actions.showAllPhotos', { defaultValue: 'Show all photos' })}</span>
                                <span className="sm:hidden">{t('listing.details.photos', { defaultValue: 'Photos' })}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="w-full h-64 md:h-[400px] bg-muted flex items-center justify-center rounded-xl">
                            <p className="text-muted-foreground">{t('listing.details.noPhotos')}</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Left Column: Details */}
                    <div className="md:col-span-2">
                        <div className="border-b pb-6 mb-6">
                            <h2 className="text-xl font-semibold mb-1">
                                <TranslatedText as="span" text={`${propertyTypes.find(t => t.id === listing.property_type)?.label || listing.property_type} hosted by ${hostName}`} />
                            </h2>
                            <p className="text-muted-foreground">
                                {t('listing.details.unitCount.guests', { count: listing.max_guests })} • {t('listing.details.unitCount.bedrooms', { count: listing.bedrooms })} • {t('listing.details.unitCount.beds', { count: listing.beds })} • {t('listing.details.unitCount.baths', { count: listing.bathrooms })}
                            </p>
                        </div>

                        {/* Description */}
                        <div className="border-b pb-6 mb-6">
                            <h3 className="font-semibold mb-4">{t('listing.details.about')}</h3>
                            {aboutSections.length > 0 ? (
                                <div className="space-y-4">
                                    {aboutSections.map((s, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="font-semibold">{s.title}</div>
                                            <TranslatedText as="p" className="text-muted-foreground whitespace-pre-line" text={s.text} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <TranslatedText as="p" className="text-muted-foreground whitespace-pre-line" text={aboutPlain || ''} />
                            )}
                        </div>

                        {/* Amenities */}
                        <div className="border-b pb-6 mb-6">
                            <h3 className="font-semibold mb-4">{t('listing.details.offers')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {amenities.slice(0, 10).map((amenityKey) => {
                                    const amenity = AMENITY_DETAILS[amenityKey];
                                    if (!amenity) return null;
                                    const Icon = amenity.icon;
                                    return (
                                        <div key={amenityKey} className="flex items-center gap-3">
                                            <Icon className="h-6 w-6 text-gray-700" />
                                            <span className="text-gray-900">{t(`amenities.${amenityKey}`, { defaultValue: amenity.label })}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {amenities.length > 10 && (
                                <Button variant="outline" className="mt-6">
                                    {t('listing.details.showAllAmenities', { count: amenities.length })}
                                </Button>
                            )}
                        </div>

                        {/* Inline Calendar Section */}
                        <div className="border-b pb-12 mb-12">
                            <h3 className="text-xl font-semibold mb-2">
                                {checkInDate && checkOutDate
                                    ? t('listing.details.nightsInCity', { count: Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)), city: listing.city })
                                    : t('listing.details.selectCheckIn')}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {checkInDate && checkOutDate
                                    ? `${format(checkInDate, 'MMM d, yyyy', { locale: localeSelection })} - ${format(checkOutDate, 'MMM d, yyyy', { locale: localeSelection })}`
                                    : t('listing.details.addDatesPricing')}
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
                                    locale={localeSelection}
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
                                    locale={localeSelection}
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
                                    {t('listing.actions.clearDates')}
                                </Button>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="border-b pb-12 mb-12">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <Star className="h-5 w-5 fill-current" />
                                    <h2 className="text-2xl font-semibold">
                                        {reviews.length === 0 ? t('listing.reviews.noReviewsYet') : `${(reviews.reduce((acc, r) => acc + Object.values(r.ratings).reduce((a, b) => a + b, 0) / 6, 0) / reviews.length).toFixed(2)} · ${t('listing.reviews.count', { count: reviews.length })}`}
                                    </h2>
                                </div>
                                <Button
                                    variant="outline"
                                    disabled={hasReviewed}
                                    onClick={() => {
                                        if (!currentUserId) {
                                            toast({
                                                title: 'Login required',
                                                description: 'Please log in to write a review.',
                                                variant: 'destructive'
                                            });
                                            const current = `${window.location.pathname}${window.location.search}`;
                                            window.location.href = `/login?redirect=${encodeURIComponent(current || '/')}`;
                                            return;
                                        }
                                        if (hasReviewed) {
                                            toast({ title: 'Already reviewed', description: 'You can only review this listing once.' });
                                            return;
                                        }
                                        setIsReviewModalOpen(true);
                                    }}
                                >
                                    {t('listing.actions.writeReview')}
                                </Button>
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
                                                    <span className="text-sm md:text-base capitalize">{t(`listing.reviews.categories.${category}`)}</span>
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
                                                            {new Date(review.timestamp).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <TranslatedText as="p" className="text-muted-foreground line-clamp-3" text={review.comment} />
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
                                        {formatPrice(listing.price_per_night || 0)}
                                    </span>
                                    <span className="text-muted-foreground"> / {t('per night')}</span>
                                </div>
                            </div>

                            <div className="border rounded-lg mb-4">
                                <div className="grid grid-cols-2 border-b">
                                    <div
                                        className="p-3 border-r cursor-pointer hover:bg-gray-50"
                                        onClick={() => {
                                            if (window.matchMedia('(max-width: 767px)').matches) {
                                                openMobileDatePicker();
                                            } else {
                                                setShowDatePicker(true);
                                                setTimeout(() => desktopCalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                                            }
                                        }}
                                    >
                                        <div className="text-[10px] font-bold uppercase">{t('listing.booking.checkIn')}</div>
                                        <div className="text-sm">{checkInDate ? checkInDate.toLocaleDateString(i18n.language) : t('listing.booking.addDate')}</div>
                                    </div>
                                    <div
                                        className="p-3 cursor-pointer hover:bg-gray-50"
                                        onClick={() => {
                                            if (window.matchMedia('(max-width: 767px)').matches) {
                                                openMobileDatePicker();
                                            } else {
                                                setShowDatePicker(true);
                                                setTimeout(() => desktopCalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                                            }
                                        }}
                                    >
                                        <div className="text-[10px] font-bold uppercase">{t('listing.booking.checkout')}</div>
                                        <div className="text-sm">{checkOutDate ? checkOutDate.toLocaleDateString(i18n.language) : t('listing.booking.addDate')}</div>
                                    </div>
                                </div>
                                <div className="p-3 relative">
                                    <div className="cursor-pointer" onClick={() => setShowGuestPicker(!showGuestPicker)}>
                                        <div className="text-[10px] font-bold uppercase">{t('listing.booking.guests')}</div>
                                        <div className="text-sm">{t('listing.booking.guestCount', { count: totalGuests })}</div>
                                    </div>

                                    {showGuestPicker && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 w-80">
                                            {/* Adults */}
                                            <div className="flex items-center justify-between py-4 border-b border-gray-200">
                                                <div>
                                                    <div className="font-semibold">{t('listing.booking.adults')}</div>
                                                    <div className="text-sm text-gray-500">{t('Age 13+')}</div>
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
                                            <Button variant="ghost" className="w-full mt-2" onClick={() => setShowGuestPicker(false)}>{t('listing.actions.close')}</Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {showDatePicker && (
                                <div className="mb-4" ref={desktopCalRef}>
                                    <div className="flex items-center justify-between mb-2">
                                        <button
                                            className="text-sm font-semibold underline"
                                            onClick={() => setShowDatePicker(false)}
                                            aria-label="Close calendar"
                                        >
                                            {t('listing.actions.close')}
                                        </button>
                                        <button
                                            className="text-sm underline text-muted-foreground hover:text-foreground"
                                            onClick={() => { setCheckInDate(null); setCheckOutDate(null); }}
                                        >
                                            {t('listing.actions.clearDates')}
                                        </button>
                                    </div>
                                    {renderCalendar()}
                                </div>
                            )}

                            {/* Price Breakdown */}
                            {checkInDate && checkOutDate && numberOfNights > 0 && (
                                <div className="mb-4 pb-4 border-b space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {formatPrice(listing.price_per_night || 0)} × {numberOfNights} {numberOfNights === 1 ? t('night') : t('nights')}
                                        </span>
                                        <span className="font-medium">{formatPrice(subtotal)}</span>
                                    </div>
                                    {serviceFee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('listing.booking.serviceFee')}</span>
                                            <span className="font-medium">{formatPrice(serviceFee)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-bold pt-3 border-t">
                                        <span>{t('listing.booking.total')}</span>
                                        <span>{formatPrice(totalPrice)}</span>
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
                                onClick={handleReserve}
                                disabled={isHost || !checkInDate || !checkOutDate}
                            >
                                {t('listing.actions.reserve')}
                            </Button>

                            <div className="text-center mt-4 text-sm text-muted-foreground">
                                {t('listing.booking.noCharge')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Where you'll be */}
                <div className="py-8 border-t border-gray-200">
                    <h3 className="text-xl font-semibold mb-4">{t('listing.details.location')}</h3>
                    <div className="mb-6">
                        <p className="font-medium text-gray-900 text-lg">{listing.address || `${listing.city}, ${listing.country}`}</p>
                        {(listing.latitude && listing.longitude) && (
                            <p className="text-gray-500 mt-1">
                                {listing.latitude}, {listing.longitude}
                            </p>
                        )}
                    </div>
                    <div ref={mapContainerRef} className="h-64 md:h-[400px] rounded-xl overflow-hidden z-0 relative">
                        {showMap ? (
                            <Suspense fallback={
                                <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                                    <MapIcon className="h-8 w-8 text-slate-300 animate-pulse" />
                                </div>
                            }>
                                <ListingMap
                                    latitude={listing.latitude}
                                    longitude={listing.longitude}
                                    title={listing.title}
                                />
                            </Suspense>
                        ) : (
                            <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <MapIcon className="h-8 w-8 text-slate-300" />
                                    <p className="text-sm text-slate-400">{t('Scroll to load map...')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location Details: Getting around & Scenic views */}
                {(listing.getting_around || (listing.scenic_views && listing.scenic_views.length > 0)) && (
                    <div className="py-8 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {listing.getting_around && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-4">{t('listing.details.gettingAround')}</h3>
                                    <TranslatedText as="p" className="text-muted-foreground whitespace-pre-line" text={listing.getting_around || ''} />
                                </div>
                            )}

                            {listing.scenic_views && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-4">{t('listing.details.scenicViews')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            try {
                                                const views = typeof listing.scenic_views === 'string'
                                                    ? JSON.parse(listing.scenic_views)
                                                    : listing.scenic_views;

                                                if (Array.isArray(views)) {
                                                    return views.map((view: string, index: number) => (
                                                        <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                                                            <TranslatedText as="span" text={view} />
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
                    <h3 className="text-xl font-semibold mb-6">{t('listing.host.meet')}</h3>
                    <div className="bg-[#F0EFE9] rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Host Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg flex flex-col items-center text-center md:col-span-1 cursor-pointer hover:shadow-xl transition" onClick={() => navigate(`/hosts/${listing.host_id}`)}>
                            <div className="relative mb-4">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={hostAvatar || undefined} />
                                    <AvatarFallback>{(hostName || 'HO').slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                {/* Removed Superhost badge as we don't have this data yet */}
                            </div>
                            <h4 className="text-2xl font-bold mb-1">{hostName}</h4>
                            {/* Removed Superhost label */}

                            <div className="w-full space-y-4 mt-4">
                                <div className="flex justify-between items-center border-b pb-4">
                                    <div className="text-left">
                                        <div className="font-bold text-lg">{reviews.length}</div>
                                        <div className="text-xs text-muted-foreground">{t('listing.host.reviews')}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">
                                            {reviews.length > 0
                                                ? (reviews.reduce((acc, r) => acc + Object.values(r.ratings).reduce((a, b) => a + b, 0) / 6, 0) / reviews.length).toFixed(2)
                                                : t('listing.details.new')}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{t('listing.host.rating')}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">{t('listing.details.new')}</div>
                                        <div className="text-xs text-muted-foreground">{t('listing.host.yearsHosting')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Host Details */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Removed fake badges (Superhost, Response rate, Free cancellation) */}

                            <div className="pt-4">
                                <h4 className="text-lg font-semibold mb-2">{t('listing.host.aboutTitle')}</h4>
                                {localStorage.getItem('host_location') && (
                                    <div className="flex items-center gap-2 mb-2 text-gray-700">
                                        <MapIcon className="h-5 w-5" />
                                        <span>{t('listing.host.livesIn', { location: localStorage.getItem('host_location') })}</span>
                                    </div>
                                )}
                                {localStorage.getItem('host_languages') && (
                                    <div className="flex items-center gap-2 mb-4 text-gray-700">
                                        <MessageSquare className="h-5 w-5" />
                                        <span>{t('listing.host.speaks', { langs: localStorage.getItem('host_languages') })}</span>
                                    </div>
                                )}
                                <p className="text-muted-foreground mb-6">
                                    {t('listing.host.bioDefault')}
                                </p>
                                <Button
                                    variant="outline"
                                    className="font-semibold border-black text-black hover:bg-gray-100"
                                    onClick={handleMessageHost}
                                >
                                    {t('listing.actions.messageHost')}
                                </Button>
                                <div className="mt-4 flex justify-center md:justify-start">
                                    <button
                                        onClick={() => setIsReportModalOpen(true)}
                                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground underline"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        {t('listing.actions.reportHost')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Things to know */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-semibold mb-6">{t('listing.details.thingsToKnow')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* House Rules */}
                        <div>
                            <h4 className="font-semibold mb-4">{t('listing.details.houseRules')}</h4>
                            <div className="space-y-2 text-sm text-gray-700">
                                <p>{t('listing.booking.checkIn')}: {houseRules.check_in_start} - {houseRules.check_in_end}</p>
                                <p>{t('listing.booking.checkout')}: {houseRules.checkout_time}</p>
                                <p>{t('listing.details.maxGuests', { count: listing.max_guests })}</p>
                                <p>{houseRules.pets_allowed ? t('host.editor.safety.rules.pets') : t('preview.noPets')}</p>
                                <p>{houseRules.events_allowed ? t('host.editor.safety.rules.events') : t('preview.noParties')}</p>
                                <p>{houseRules.smoking_allowed ? t('listing.details.houseRulesProps.smokingAllowed') : t('preview.noSmoking')}</p>
                                <p>{houseRules.quiet_hours ? t('listing.details.houseRulesProps.quietHoursEnforced') : t('listing.details.houseRulesProps.quietHoursNotEnforced')}</p>
                                <p>{houseRules.commercial_photography_allowed ? t('listing.details.houseRulesProps.photographyAllowed') : t('listing.details.houseRulesProps.photographyNotAllowed')}</p>
                            </div>
                        </div>

                        {/* Safety & Property */}
                        <div>
                            <h4 className="font-semibold mb-4">{t('listing.details.safetyProperty')}</h4>
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
                                        <TranslatedText key={index} as="p" text={device} />
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Cancellation Policy */}
                        <div>
                            <h4 className="font-semibold mb-4">{t('listing.details.cancellationPolicy')}</h4>
                            <p className="text-sm text-gray-700">
                                {listing.cancellation_policy || t('listing.details.flexibleCancellation')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Booking Bar */}
            <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 p-4 md:hidden pb-safe">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex flex-col">
                        {checkInDate && checkOutDate ? (
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-lg">
                                    {formatPrice(totalPrice)}
                                </span>
                                <span className="text-sm text-muted-foreground">{t('listing.booking.total')}</span>
                            </div>
                        ) : (
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-lg">
                                    {formatPrice(listing.price_per_night || 0)}
                                </span>
                                <span className="text-sm text-muted-foreground">/ {t('per night')}</span>
                            </div>
                        )}
                        <span className="text-xs font-medium underline cursor-pointer" onClick={() => setShowDatePickerMobile(true)}>
                            {checkInDate && checkOutDate ?
                                `${format(checkInDate, 'MMM d', { locale: localeSelection })} - ${format(checkOutDate, 'MMM d', { locale: localeSelection })}` :
                                t('listing.booking.addDate')
                            }
                        </span>
                    </div>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8"
                        onClick={() => (checkInDate && checkOutDate ? handleReserve() : openMobileDatePicker())}
                    >
                        {checkInDate && checkOutDate ? t('listing.actions.reserve') : t('listing.booking.selectDates')}
                    </Button>
                </div>
            </div>

            <Dialog
                open={showDatePickerMobile}
                onOpenChange={(open) => {
                    if (open) {
                        try {
                            (document.activeElement as HTMLElement | null)?.blur?.();
                        } catch { /* noop */ }
                    }
                    setShowDatePickerMobile(open);
                }}
            >
                <DialogContent
                    className="md:hidden w-full max-w-none p-0 gap-0"
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        closeBtnRef.current?.focus();
                    }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <button ref={closeBtnRef} className="p-2 -ml-2" aria-label="Close" onClick={() => setShowDatePickerMobile(false)}>
                            <X className="h-5 w-5" />
                        </button>
                        <button
                            className="text-sm font-semibold underline"
                            onClick={() => { setCheckInDate(null); setCheckOutDate(null); }}
                        >
                            {t('listing.actions.clearDates')}
                        </button>
                    </div>
                    <div className="px-4 pt-4">
                        <DialogHeader className="mb-2">
                            <DialogTitle className="text-lg font-semibold">{t('listing.details.selectCheckIn')}</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">{t('listing.details.addDatesPricing')}</DialogDescription>
                        </DialogHeader>
                        <DayPicker
                            mode="range"
                            selected={checkInDate ? { from: checkInDate, to: checkOutDate || undefined } : undefined}
                            onSelect={(range: DateRange | undefined) => {
                                if (range?.from) setCheckInDate(range.from);
                                setCheckOutDate(range?.to || null);
                                if (!range) { setCheckInDate(null); setCheckOutDate(null); }
                            }}
                            numberOfMonths={1}
                            disabled={[{ before: new Date() }, ...disabledDays]}
                            modifiersStyles={{
                                selected: { backgroundColor: '#222222', color: 'white' },
                                range_middle: { backgroundColor: '#F7F7F7', color: '#222222' },
                                range_start: { backgroundColor: '#222222', color: 'white' },
                                range_end: { backgroundColor: '#222222', color: 'white' }
                            }}
                            locale={localeSelection}
                            className="border-0"
                        />
                    </div>
                    <div className="p-4 border-t">
                        <Button
                            className="w-full"
                            disabled={!checkInDate || !checkOutDate}
                            onClick={() => {
                                setShowDatePicker(false);
                                handleReserve();
                            }}
                        >
                            {t('listing.actions.reserve')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Footer />
        </div >
    );
};

export default ListingDetails;
