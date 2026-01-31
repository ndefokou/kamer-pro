import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Minus, Settings, Home, MapPin, Users, Key, BookOpen, Shield, FileText, Link as LinkIcon, Camera, Eye, X, Grid3x3, Mail, Trash2, Star } from 'lucide-react';
import { getImageUrl, formatPrice } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';
import { AMENITY_DETAILS } from '@/data/amenities';
import AddAmenitiesPanel from '@/components/host/AddAmenitiesPanel';
import HouseRulesSection, { HouseRules, DEFAULT_HOUSE_RULES } from '@/components/host/HouseRulesSection';
import ListingPreview from '@/components/host/ListingPreview';
import GuestSafetyModal from '@/components/host/GuestSafetyModal';
import { LocationDetailModals } from '@/components/host/LocationDetailModals';
import { SAFETY_CONSIDERATIONS, SAFETY_DEVICES } from '@/data/guestSafety';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { AxiosError } from 'axios';
import { useHost } from '@/contexts/HostContext';

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
    safety_items: string[];
    cancellation_policy: string;
}

interface ListingSettings {
    id: number;
    listing_id: string;
    base_price?: number;
    weekend_price?: number;
    smart_pricing_enabled: number;
    weekly_discount: number;
    monthly_discount: number;
    min_nights: number;
    max_nights: number;
    advance_notice: string;
    same_day_cutoff_time: string;
    preparation_time: string;
    availability_window: number;
}






const ListingEditor: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { draft } = useHost();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('photos');
    const [photoView, setPhotoView] = useState<'overview' | 'bedroom' | 'bathroom' | 'additional'>('overview');
    const [settings, setSettings] = useState<ListingSettings | null>(null);
    const [showAddAmenities, setShowAddAmenities] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showPriceSettings, setShowPriceSettings] = useState(false);
    const [editingDescriptionSection, setEditingDescriptionSection] = useState<string | null>(null);
    const [tempDescription, setTempDescription] = useState('');
    const [tempData, setTempData] = useState<{ title?: string; description?: string }>({});

    useEffect(() => {
        if (listing) {
            setTempData({
                title: listing.title,
                description: listing.description
            });
        }
    }, [listing]);

    const handleSave = async (field: 'title' | 'description') => {
        if (!listing) return;
        try {
            const updateData: { title?: string; description?: string } = {};
            if (field === 'title') updateData.title = tempData.title;
            if (field === 'description') updateData.description = tempData.description;

            await apiClient.put(`/listings/${id}`, updateData);
            setListing({ ...listing, ...updateData });
            toast({ title: t('common.saved', 'Saved'), description: t('host.editor.savedSuccessfully', 'Your changes have been saved.') });
        } catch (error) {
            console.error(`Failed to update ${field}:`, error);
            toast({ title: t('common.error', 'Error'), description: t('host.editor.saveFailed', 'Failed to save changes'), variant: 'destructive' });
        }
    };
    const [showGuestSafety, setShowGuestSafety] = useState(false);
    const [guestSafetySection, setGuestSafetySection] = useState<'considerations' | 'devices'>('considerations');
    const [showAllPhotos, setShowAllPhotos] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lightboxTouchStartX = useRef<number | null>(null);

    const openLightbox = (url: string) => {
        setSelectedPhoto(url);
        if (listing) {
            const idx = listing.photos.findIndex(p => p.url === url);
            setSelectedPhotoIndex(idx >= 0 ? idx : 0);
        }
    };

    const showPrevPhoto = useCallback(() => {
        if (!listing || selectedPhotoIndex === null) return;
        const nextIndex = (selectedPhotoIndex - 1 + listing.photos.length) % listing.photos.length;
        setSelectedPhotoIndex(nextIndex);
        setSelectedPhoto(listing.photos[nextIndex].url);
    }, [listing, selectedPhotoIndex]);

    const showNextPhoto = useCallback(() => {
        if (!listing || selectedPhotoIndex === null) return;
        const nextIndex = (selectedPhotoIndex + 1) % listing.photos.length;
        setSelectedPhotoIndex(nextIndex);
        setSelectedPhoto(listing.photos[nextIndex].url);
    }, [listing, selectedPhotoIndex]);

    useEffect(() => {
        if (!selectedPhoto) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') showPrevPhoto();
            else if (e.key === 'ArrowRight') showNextPhoto();
            else if (e.key === 'Escape') setSelectedPhoto(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedPhoto, selectedPhotoIndex, listing, showPrevPhoto, showNextPhoto]);

    // Location detail modals
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showNeighborhoodModal, setShowNeighborhoodModal] = useState(false);
    const [showGettingAroundModal, setShowGettingAroundModal] = useState(false);
    const [showScenicViewsModal, setShowScenicViewsModal] = useState(false);
    const [showLocationSharingModal, setShowLocationSharingModal] = useState(false);
    const [neighborhoodDescription, setNeighborhoodDescription] = useState('');
    const [gettingAroundDescription, setGettingAroundDescription] = useState('');
    const [scenicViews, setScenicViews] = useState<string[]>([]);
    const [showGeneralLocation, setShowGeneralLocation] = useState(true);
    const [isMobileSection, setIsMobileSection] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
    const [tempCaption, setTempCaption] = useState('');

    const handleDeletePhoto = async (photoId: string) => {
        if (!listing || !id) return;
        if (!confirm(t('host.editor.confirmDeletePhoto', 'Are you sure you want to delete this photo?'))) return;

        try {
            const updatedPhotos = listing.photos.filter(p => p.id !== photoId);
            const syncData = updatedPhotos.map((p, idx) => ({
                url: p.url,
                caption: p.caption,
                room_type: (p as any).room_type || null,
                is_cover: (p as any).is_cover === 1 || (p as any).is_cover === true,
                display_order: idx
            }));

            await apiClient.post(`/listings/${id}/photos`, { photos: syncData });
            setListing({ ...listing, photos: updatedPhotos });
            toast({ title: t('common.deleted', 'Deleted'), description: t('host.editor.photoDeleted', 'Photo has been deleted.') });
        } catch (error) {
            console.error('Failed to delete photo:', error);
            toast({ title: t('common.error', 'Error'), description: t('host.editor.deletePhotoFailed', 'Failed to delete photo'), variant: 'destructive' });
        }
    };

    const handleSetCover = async (photoId: string) => {
        if (!listing || !id) return;

        try {
            const updatedPhotos = listing.photos.map(p => ({
                ...p,
                is_cover: p.id === photoId ? 1 : 0
            }));
            const syncData = updatedPhotos.map((p, idx) => ({
                url: p.url,
                caption: p.caption,
                room_type: (p as any).room_type || null,
                is_cover: p.id === photoId,
                display_order: idx
            }));

            await apiClient.post(`/listings/${id}/photos`, { photos: syncData });
            setListing({ ...listing, photos: updatedPhotos as any });
            toast({ title: t('common.updated', 'Updated'), description: t('host.editor.coverPhotoUpdated', 'Cover photo has been updated.') });
        } catch (error) {
            console.error('Failed to set cover photo:', error);
            toast({ title: t('common.error', 'Error'), description: t('host.editor.setCoverFailed', 'Failed to update cover photo'), variant: 'destructive' });
        }
    };

    const handleUpdateCaption = async () => {
        if (!listing || !id || !editingCaptionId) return;

        try {
            const updatedPhotos = listing.photos.map(p =>
                p.id === editingCaptionId ? { ...p, caption: tempCaption } : p
            );
            const syncData = updatedPhotos.map((p, idx) => ({
                url: p.url,
                caption: p.caption,
                room_type: (p as any).room_type || null,
                is_cover: (p as any).is_cover === 1 || (p as any).is_cover === true,
                display_order: idx
            }));

            await apiClient.post(`/listings/${id}/photos`, { photos: syncData });
            setListing({ ...listing, photos: updatedPhotos });
            setEditingCaptionId(null);
            toast({ title: t('common.saved', 'Saved'), description: t('host.editor.captionSaved', 'Caption has been saved.') });
        } catch (error) {
            console.error('Failed to update caption:', error);
            toast({ title: t('common.error', 'Error'), description: t('host.editor.saveCaptionFailed', 'Failed to save caption'), variant: 'destructive' });
        }
    };



    useEffect(() => {
        const fetchListing = async () => {
            try {
                const response = await apiClient.get(`/listings/${id}`);
                setListing(response.data.listing ? {
                    ...response.data.listing,
                    amenities: response.data.amenities || [],
                    photos: response.data.photos || [],
                    safety_items: response.data.safety_items || []
                } : null);
            } catch (error) {
                console.error('Failed to fetch listing:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchSettings = async () => {
            try {
                const response = await apiClient.get(`/calendar/${id}/settings`);
                setSettings(response.data);
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            }
        };

        if (id) {
            fetchListing();
            fetchSettings();
        }
    }, [id]);



    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">{t('common.loading', 'Loading...')}</div>;
    }

    if (!listing) {
        return <div className="min-h-screen flex items-center justify-center">{t('host.editor.notFound', 'Listing not found')}</div>;
    }

    const sidebarItems = [
        { id: 'photos', label: t('host.editor.sidebar.photos', 'Photos'), icon: Camera, description: t('host.editor.sidebar.addAtLeastNPhotos', 'Add at least 5 photos') },
        { id: 'title', label: t('host.editor.sidebar.title', 'Title'), icon: FileText, description: listing?.title || t('host.editor.sidebar.addTitle', 'Add a title') },
        {
            id: 'description',
            label: t('host.editor.sidebar.description', 'Description'),
            icon: null,
            description: (() => {
                try {
                    const parsed = listing?.description ? JSON.parse(listing.description) : null;
                    return parsed?.listingDescription || t('host.editor.sidebar.addDescription', 'Add a description');
                } catch {
                    return listing?.description || t('host.editor.sidebar.addDescription', 'Add a description');
                }
            })()
        },
        { id: 'pricing', label: t('host.editor.sidebar.pricing', 'Pricing'), icon: null, description: `${formatPrice(listing.price_per_night)} ${t('host.editor.perNight', 'per night')}` },
        { id: 'availability', label: t('host.editor.sidebar.availability', 'Availability'), icon: null, description: settings?.min_nights ? t('host.editor.sidebar.nightStaysRangeWithCount', '{{min}} – {{max}} night stays', { min: settings.min_nights, max: settings.max_nights || 365 }) : t('host.editor.sidebar.addDetails', 'Add details') },
        { id: 'number_of_guests', label: t('host.editor.sidebar.numberOfGuests', 'Number of guests'), icon: Users, description: `${listing.max_guests} ${t('common.guests', 'guests')}` },
        {
            id: 'amenities', label: t('host.editor.sidebar.amenities', 'Amenities'), icon: Plus, description: listing.amenities && listing.amenities.length > 0
                ? listing.amenities.slice(0, 2).map(id => AMENITY_DETAILS[id]?.label).join(' · ') + (listing.amenities.length > 2 ? ` +${listing.amenities.length - 2} ${t('host.editor.more', 'more')}` : '')
                : t('host.editor.sidebar.addDetails', 'Add details')
        },
        { id: 'location', label: t('host.editor.sidebar.location', 'Location'), icon: MapPin, description: listing.address || listing.city || t('host.editor.sidebar.addLocation', 'Add location') },
        { id: 'house_rules', label: t('host.editor.sidebar.houseRules', 'House rules'), icon: BookOpen, description: t('host.editor.sidebar.guestsMustAgree', 'Guests must agree to your rules') },
        {
            id: 'guest_safety',
            label: t('host.editor.sidebar.guestSafety', 'Guest safety'),
            icon: Shield,
            description: (() => {
                const safetyItems = listing?.safety_items || [];
                const deviceCount = safetyItems.filter(id => SAFETY_DEVICES.some(d => d.id === id)).length;
                if (deviceCount > 0) return `${deviceCount} ${t('host.editor.safetyDevice', 'safety device')}${deviceCount > 1 ? 's' : ''}`;
                return t('host.editor.sidebar.addSafetyInformation', 'Add safety information');
            })()
        },
        {
            id: 'cancellation_policy',
            label: t('host.editor.sidebar.cancellationPolicy', 'Cancellation policy'),
            icon: FileText,
            description: listing.cancellation_policy || t('host.editor.sidebar.addPolicy', 'Add policy')
        },
    ];

    const cancellationPolicies = [
        {
            id: 'flexible',
            label: t('host.editor.cancellation.flexible', 'Flexible'),
            description: t('host.editor.cancellation.flexibleDesc', 'Full refund 1 day prior to arrival')
        },
        {
            id: 'moderate',
            label: t('host.editor.cancellation.moderate', 'Moderate'),
            description: t('host.editor.cancellation.moderateDesc', 'Full refund 5 days prior to arrival')
        },
        {
            id: 'strict',
            label: t('host.editor.cancellation.strict', 'Strict'),
            description: t('host.editor.cancellation.strictDesc', 'Full refund for 48 hours after booking, if the check-in date is at least 14 days away. 50% refund up to 7 days prior to arrival.')
        }
    ];

    const photoSidebarItems = [
        { id: 'additional', label: 'Additional photos', image: listing.photos.length > 0 ? getImageUrl(listing.photos[0].url) : null },
    ];

    const currentSectionLabel = sidebarItems.find(s => s.id === activeSection)?.label || t('host.editor.listingEditor', 'Listing editor');

    const stepToPath = (step: number): string => {
        switch (step) {
            case 0: return '/host/intro';
            case 1: return '/host/amenities';
            case 2: return '/host/location';
            case 3: return '/host/photos';
            case 4: return '/host/title';
            case 5: return '/host/description';
            case 6: return '/host/booking-settings';
            case 7: return '/host/pricing';
            case 8: return '/host/safety';
            default: return '/host/preview';
        }
    };

    const handlePublish = async () => {
        if (!id) return;
        try {
            setIsPublishing(true);
            await apiClient.post(`/listings/${id}/publish`);
            toast({
                title: t('host.preview.publishedTitle', 'Listing published!'),
                description: t('host.preview.publishedDesc', 'Your listing is now live on Le Mboko'),
            });
            navigate('/host/dashboard');
        } catch (error) {
            let message = t('host.preview.publishFailedDesc', 'Please check all required fields') as string;
            if (error instanceof AxiosError && error.response?.data?.error) {
                message = error.response.data.error as string;
            } else if (error instanceof Error) {
                message = error.message;
            }
            toast({
                title: t('host.preview.publishFailedTitle', 'Failed to publish'),
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-white flex flex-col">
                {/* Header */}
                <header className="h-16 md:h-20 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 z-50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (photoView !== 'overview') { setPhotoView('overview'); return; }
                                if (isMobileSection) { setIsMobileSection(false); return; }
                                navigate('/host/dashboard');
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-lg font-semibold">
                            {photoView !== 'overview' ? t('host.editor.photoTour', 'Photo tour') : (isMobileSection ? currentSectionLabel : t('host.editor.listingEditor', 'Listing editor'))}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => navigate('/host/preview')}
                            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm font-medium">{t('host.editor.view', 'View')}</span>
                        </button>
                        {listing.status !== 'published' && (
                            <Button onClick={handlePublish} disabled={isPublishing} className="rounded-full">
                                {isPublishing ? t('host.preview.publishing', 'Publishing...') : t('host.preview.publishListing', 'Publish listing')}
                            </Button>
                        )}
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <aside className="hidden lg:block w-80 border-r border-gray-200 overflow-y-auto h-[calc(100vh-64px)] pb-10">
                        <div className="p-6">
                            {photoView === 'overview' ? (
                                <>
                                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full mb-8 w-fit">
                                        <button className="px-4 py-1.5 bg-white rounded-full text-sm font-semibold shadow-sm">{t('host.editor.yourSpace', 'Your space')}</button>
                                    </div>

                                    <button onClick={() => navigate(stepToPath(draft.step || 0))} className="w-full text-left mb-8 border border-gray-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                                <span className="font-semibold text-sm">{t('host.editor.completeRequiredSteps', 'Complete required steps')}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{t('host.editor.finalTasksToPublish', 'Finish these final tasks to publish your listing and start getting booked.')}</p>
                                        </div>
                                        <ChevronLeft className="h-4 w-4 rotate-180 text-gray-400" />
                                    </button>

                                    <div className="space-y-4">
                                        {sidebarItems.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveSection(item.id)}
                                                className={`w-full text-left p-4 rounded-xl border transition-all ${activeSection === item.id
                                                    ? 'border-black ring-1 ring-black bg-gray-50'
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                                    }`}
                                            >
                                                <div className="font-semibold text-gray-900 mb-1">{item.label}</div>
                                                <div className="text-sm text-gray-500">{item.description}</div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* View Button */}
                                    <div className="mt-8 pt-6 border-t border-gray-200">
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                                        >
                                            <Eye className="h-5 w-5" />
                                            {t('host.editor.view', 'View')}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    {photoSidebarItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setPhotoView('additional')}
                                            className="w-full group flex flex-col items-center text-center"
                                        >
                                            <div className={`w-24 h-24 rounded-xl overflow-hidden mb-2 border-2 transition-all ${photoView === item.id ? 'border-black ring-1 ring-black' : 'border-transparent group-hover:scale-105'
                                                }`}>
                                                {item.image ? (
                                                    <OptimizedImage src={item.image} alt={item.label} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                        <Camera className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-xs font-medium ${photoView === item.id ? 'text-black' : 'text-gray-500'}`}>
                                                {item.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] p-4 sm:p-6 md:p-8 lg:p-12 pb-24 md:pb-12">
                        <div className="max-w-4xl mx-auto">
                            {photoView === 'overview' && !isMobileSection && (
                                <div className="md:hidden mb-6">
                                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full mb-4 w-fit">
                                        <button className="px-4 py-1.5 bg-white rounded-full text-sm font-semibold shadow-sm">{t('host.editor.yourSpace', 'Your space')}</button>
                                    </div>
                                    <div className="space-y-3">
                                        {sidebarItems.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setActiveSection(item.id);
                                                    setIsMobileSection(true);
                                                    setPhotoView('overview');
                                                    if (typeof window !== 'undefined' && 'scrollTo' in window) {
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }
                                                }}
                                                className={`w-full text-left p-4 rounded-xl border transition-all ${activeSection === item.id
                                                    ? 'border-black ring-1 ring-black bg-gray-50'
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                                    }`}
                                            >
                                                <div className="font-semibold text-gray-900 mb-1">{item.label}</div>
                                                <div className="text-sm text-gray-500">{item.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {photoView === 'overview' ? (
                                activeSection === 'photos' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h2 className="text-2xl font-semibold">{t('host.editor.photoTour', 'Photo tour')}</h2>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="rounded-full border-gray-300"
                                                    onClick={() => setShowAllPhotos(true)}
                                                >
                                                    {t('host.editor.allPhotos', 'All photos')}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="rounded-full border-gray-300 w-10 h-10"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Plus className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-gray-500 mb-8 max-w-2xl">
                                            {t('host.editor.photoTourHelp', 'Manage photos and add details. Guests will only see your tour if every room has a photo.')}
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {listing.photos.map((photo) => (
                                                <div
                                                    key={photo.id}
                                                    className="flex flex-col gap-2"
                                                >
                                                    <div
                                                        className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 relative group cursor-pointer"
                                                        onClick={() => openLightbox(photo.url)}
                                                    >
                                                        <OptimizedImage src={getImageUrl(photo.url)} alt={photo.caption} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                                                                    className="p-2 bg-white rounded-full text-red-600 hover:bg-gray-100 shadow-sm"
                                                                    title={t('common.delete', 'Delete')}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                            <div className="flex justify-center">
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="rounded-full bg-white text-black hover:bg-gray-100"
                                                                    onClick={(e) => { e.stopPropagation(); handleSetCover(photo.id); }}
                                                                >
                                                                    <Star className={`h-4 w-4 mr-1 ${((photo as any).is_cover === 1 || (photo as any).is_cover === true) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                                                    {((photo as any).is_cover === 1 || (photo as any).is_cover === true) ? t('host.editor.cover', 'Cover') : t('host.editor.setAsCover', 'Set as cover')}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {((photo as any).is_cover === 1 || (photo as any).is_cover === true) && (
                                                            <div className="absolute top-3 left-3 bg-white text-black px-2 py-1 rounded text-xs font-semibold shadow-sm">
                                                                {t('host.editor.cover', 'Cover')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 px-1">
                                                        {editingCaptionId === photo.id ? (
                                                            <div className="flex-1 flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={tempCaption}
                                                                    onChange={(e) => setTempCaption(e.target.value)}
                                                                    className="flex-1 text-sm border-b border-black focus:outline-none"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleUpdateCaption();
                                                                        if (e.key === 'Escape') setEditingCaptionId(null);
                                                                    }}
                                                                />
                                                                <button onClick={handleUpdateCaption} className="text-xs font-semibold underline">{t('common.save', 'Save')}</button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm text-gray-600 truncate flex-1">{photo.caption || t('host.editor.addCaption', 'Add a caption')}</p>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingCaptionId(photo.id);
                                                                        setTempCaption(photo.caption || '');
                                                                    }}
                                                                    className="text-xs font-semibold underline shrink-0"
                                                                >
                                                                    {t('common.edit', 'Edit')}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {listing.photos.length === 0 && (
                                                <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                                    <p className="text-gray-500">{t('host.editor.noPhotosYet', 'No photos uploaded yet')}</p>
                                                    <Button
                                                        variant="outline"
                                                        className="mt-4 rounded-full"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        {t('host.editor.addPhotos', 'Add photos')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            ) : (
                                !isMobileSection ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h2 className="text-2xl font-semibold">{t('host.editor.additionalPhotos', 'Additional photos')}</h2>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="rounded-full border-gray-300"
                                                    onClick={() => setShowAllPhotos(true)}
                                                >
                                                    {t('host.editor.managePhotos', 'Manage photos')}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="rounded-full border-gray-300 w-10 h-10"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Plus className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-gray-500 mb-8 max-w-2xl">
                                            {photoView === 'additional'
                                                ? t('host.editor.additionalPhotosHelp', "These photos aren't included in a room or space, but they'll still appear in your listing.")
                                                : t('host.editor.addRoomPhotosHelp', 'Add photos to this room to complete your photo tour.')}
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {listing.photos.map((photo) => (
                                                <div
                                                    key={photo.id}
                                                    className="flex flex-col gap-2"
                                                >
                                                    <div
                                                        className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 relative group cursor-pointer"
                                                        onClick={() => openLightbox(photo.url)}
                                                    >
                                                        <OptimizedImage src={getImageUrl(photo.url)} alt={photo.caption} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                                                                    className="p-2 bg-white rounded-full text-red-600 hover:bg-gray-100 shadow-sm"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                            <div className="flex justify-center">
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="rounded-full bg-white text-black hover:bg-gray-100"
                                                                    onClick={(e) => { e.stopPropagation(); handleSetCover(photo.id); }}
                                                                >
                                                                    <Star className={`h-4 w-4 mr-1 ${((photo as any).is_cover === 1 || (photo as any).is_cover === true) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                                                    {((photo as any).is_cover === 1 || (photo as any).is_cover === true) ? t('host.editor.cover', 'Cover') : t('host.editor.setAsCover', 'Set as cover')}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {((photo as any).is_cover === 1 || (photo as any).is_cover === true) && (
                                                            <div className="absolute top-3 left-3 bg-white text-black px-2 py-1 rounded text-xs font-semibold shadow-sm">
                                                                {t('host.editor.cover', 'Cover')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 px-1">
                                                        {editingCaptionId === photo.id ? (
                                                            <div className="flex-1 flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={tempCaption}
                                                                    onChange={(e) => setTempCaption(e.target.value)}
                                                                    className="flex-1 text-sm border-b border-black focus:outline-none"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleUpdateCaption();
                                                                        if (e.key === 'Escape') setEditingCaptionId(null);
                                                                    }}
                                                                />
                                                                <button onClick={handleUpdateCaption} className="text-xs font-semibold underline">{t('common.save', 'Save')}</button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm text-gray-600 truncate flex-1">{photo.caption || t('host.editor.addCaption', 'Add a caption')}</p>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingCaptionId(photo.id);
                                                                        setTempCaption(photo.caption || '');
                                                                    }}
                                                                    className="text-xs font-semibold underline shrink-0"
                                                                >
                                                                    {t('common.edit', 'Edit')}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {listing.photos.length === 0 && (
                                                <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                                    <p className="text-gray-500">{t('host.editor.noPhotosYet', 'No photos uploaded yet')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null
                            )}

                            {/* Placeholders for other sections */}
                            {activeSection === 'title' && (
                                <div className={`${isMobileSection ? '' : 'hidden md:block'} max-w-2xl`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-1">{t('host.editor.sidebar.title', 'Title')}</h2>
                                            <p className="text-gray-500 text-sm">{t('host.editor.title.help', 'Your title should highlight what makes your place special.')}</p>
                                        </div>
                                        <button
                                            onClick={() => handleSave('title')}
                                            className="font-medium underline hover:text-gray-800"
                                        >
                                            {t('host.editor.save', 'Save')}
                                        </button>
                                    </div>
                                    <textarea
                                        value={tempData.title || ''}
                                        onChange={(e) => setTempData({ ...tempData, title: e.target.value })}
                                        className="w-full p-4 border rounded-xl text-lg min-h-[100px] focus:outline-none focus:ring-2 focus:ring-black"
                                        placeholder={t('host.editor.title.placeholder', 'Add a title')}
                                        maxLength={50}
                                    />
                                </div>
                            )}

                            {activeSection === 'pricing' && settings && (
                                <div className={`${isMobileSection ? '' : 'hidden md:block'} max-w-2xl`}>
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-semibold mb-2">{t('host.editor.sidebar.pricing', 'Pricing')}</h2>
                                        <p className="text-gray-500">{t('host.editor.pricing.simpleHelp', 'Set your nightly price')}</p>
                                    </div>

                                    <div className="border border-gray-300 rounded-xl p-4 mb-4">
                                        <label className="block text-sm text-gray-600 mb-2">{t('host.editor.pricing.nightlyPrice', 'Nightly price')}</label>
                                        <div className="flex items-baseline gap-2">
                                            <input
                                                type="number"
                                                value={settings.base_price ?? listing.price_per_night}
                                                onChange={(e) => setSettings({ ...settings, base_price: Number(e.target.value) })}
                                                className="text-3xl font-semibold border-none bg-transparent p-0 w-32 focus:outline-none focus:ring-0"
                                                min={0}
                                            />
                                            <span className="text-3xl font-semibold">FCFA</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            className="rounded-lg"
                                            onClick={async () => {
                                                try {
                                                    await apiClient.put(`/calendar/${id}/settings`, { base_price: settings.base_price ?? listing.price_per_night });
                                                    toast({ title: t('common.saved', 'Saved'), description: t('host.editor.pricing.updated', 'Nightly price updated') });
                                                } catch (error) {
                                                    console.error('Failed to update price:', error);
                                                    toast({ title: t('common.error', 'Error'), description: t('host.editor.pricing.updateFailed', 'Failed to update price'), variant: 'destructive' });
                                                }
                                            }}
                                        >
                                            {t('common.save', 'Save')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'availability' && settings && (
                                <div className={`${isMobileSection ? '' : 'hidden md:block'} max-w-2xl`}>
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-semibold mb-2">{t('host.editor.sidebar.availability', 'Availability')}</h2>
                                        <p className="text-gray-500">
                                            {t('host.editor.availability.help', 'These settings apply to all nights, unless you customize them by date.')}
                                        </p>
                                    </div>

                                    {/* Trip Length */}
                                    <div className="mb-8">
                                        <h3 className="text-base font-semibold text-gray-900 mb-4">{t('host.editor.availability.tripLength', 'Trip length')}</h3>

                                        <div className="space-y-4">
                                            <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                                <label className="block text-sm text-gray-600 mb-2">{t('host.editor.availability.minNights', 'Minimum nights')}</label>
                                                <input
                                                    type="number"
                                                    value={settings.min_nights || ''}
                                                    onChange={(e) => setSettings({ ...settings, min_nights: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                    className="text-3xl font-semibold border-none bg-transparent p-0 w-20 focus:outline-none focus:ring-0"
                                                    placeholder="1"
                                                />
                                            </div>

                                            <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                                <label className="block text-sm text-gray-600 mb-2">{t('host.editor.availability.maxNights', 'Maximum nights')}</label>
                                                <input
                                                    type="number"
                                                    value={settings.max_nights || ''}
                                                    onChange={(e) => setSettings({ ...settings, max_nights: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                    className="text-3xl font-semibold border-none bg-transparent p-0 w-24 focus:outline-none focus:ring-0"
                                                    placeholder="365"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advance Notice */}
                                    <div className="mb-8">
                                        <h3 className="text-base font-semibold text-gray-900 mb-1">{t('host.editor.availability.advanceNotice', 'Advance notice')}</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {t('host.editor.availability.advanceNoticeHelp', "How much notice do you need between a guest's booking and their arrival?")}
                                        </p>

                                        <div className="space-y-4">
                                            <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                                <label className="block text-sm text-gray-600 mb-3">{t('host.editor.availability.days', 'Days')}</label>
                                                <div className="relative">
                                                    <select
                                                        value={settings.advance_notice}
                                                        onChange={(e) => setSettings({ ...settings, advance_notice: e.target.value })}
                                                        className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                                                    >
                                                        <option value="same_day">{t('host.editor.availability.sameDay', 'Same day')}</option>
                                                        <option value="1_day">{t('host.editor.availability.1day', '1 day')}</option>
                                                        <option value="2_days">{t('host.editor.availability.2days', '2 days')}</option>
                                                        <option value="3_days">{t('host.editor.availability.3days', '3 days')}</option>
                                                        <option value="7_days">{t('host.editor.availability.7days', '7 days')}</option>
                                                    </select>
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <ChevronLeft className="h-5 w-5 text-gray-400 -rotate-90" />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-3">
                                                    {t('host.editor.availability.sameDayHelp', 'Guests can book on the same day as check-in until this time.')}
                                                </p>
                                            </div>

                                            <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                                <label className="block text-sm text-gray-600 mb-3">{t('host.editor.availability.time', 'Time')}</label>
                                                <div className="relative">
                                                    <select
                                                        value={settings.same_day_cutoff_time}
                                                        onChange={(e) => setSettings({ ...settings, same_day_cutoff_time: e.target.value })}
                                                        className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                                                    >
                                                        {Array.from({ length: 24 }).map((_, i) => {
                                                            const hour = i;
                                                            const time = `${hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour)}:00 ${hour < 12 ? 'AM' : 'PM'}`;
                                                            return <option key={i} value={`${hour}:00`}>{time}</option>;
                                                        })}
                                                    </select>
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <ChevronLeft className="h-5 w-5 text-gray-400 -rotate-90" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preparation Time */}
                                    <div className="mb-8">
                                        <h3 className="text-base font-semibold text-gray-900 mb-1">{t('host.editor.availability.preparationTime', 'Preparation time')}</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {t('host.editor.availability.preparationTimeHelp', 'Block time before and after each reservation to prepare your space.')}
                                        </p>

                                        <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                            <div className="relative">
                                                <select
                                                    value={settings.preparation_time}
                                                    onChange={(e) => setSettings({ ...settings, preparation_time: e.target.value })}
                                                    className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                                                >
                                                    <option value="none">{t('host.editor.availability.none', 'None')}</option>
                                                    <option value="1_night">{t('host.editor.availability.1night', '1 night before and after each reservation')}</option>
                                                    <option value="2_nights">{t('host.editor.availability.2nights', '2 nights before and after each reservation')}</option>
                                                </select>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <ChevronLeft className="h-5 w-5 text-gray-400 -rotate-90" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Availability Window */}
                                    <div className="mb-8">
                                        <h3 className="text-base font-semibold text-gray-900 mb-1">{t('host.editor.availability.availabilityWindow', 'Availability window')}</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {t('host.editor.availability.availabilityWindowHelp', 'How far in advance can guests book?')}
                                        </p>

                                        <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                            <div className="relative">
                                                <select
                                                    value={settings.availability_window}
                                                    onChange={(e) => setSettings({ ...settings, availability_window: Number(e.target.value) })}
                                                    className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                                                >
                                                    <option value={3}>{t('host.editor.availability.monthsInAdvance', { count: 3, defaultValue: '3 months in advance' })}</option>
                                                    <option value={6}>{t('host.editor.availability.monthsInAdvance', { count: 6, defaultValue: '6 months in advance' })}</option>
                                                    <option value={9}>{t('host.editor.availability.monthsInAdvance', { count: 9, defaultValue: '9 months in advance' })}</option>
                                                    <option value={12}>{t('host.editor.availability.monthsInAdvance', { count: 12, defaultValue: '12 months in advance' })}</option>
                                                    <option value={24}>{t('host.editor.availability.monthsInAdvance', { count: 24, defaultValue: '24 months in advance' })}</option>
                                                </select>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <ChevronLeft className="h-5 w-5 text-gray-400 -rotate-90" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end border-t pt-6">
                                        <Button
                                            onClick={async () => {
                                                try {
                                                    await apiClient.put(`/calendar/${id}/settings`, {
                                                        min_nights: settings.min_nights,
                                                        max_nights: settings.max_nights,
                                                        advance_notice: settings.advance_notice,
                                                        same_day_cutoff_time: settings.same_day_cutoff_time,
                                                        preparation_time: settings.preparation_time,
                                                        availability_window: settings.availability_window
                                                    });
                                                    // Show success message or toast
                                                } catch (error) {
                                                    console.error('Failed to update availability:', error);
                                                }
                                            }}
                                            className="bg-black text-white hover:bg-gray-800 rounded-lg px-6"
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div >
                            )}



                            {
                                activeSection === 'number_of_guests' && (
                                    <div className={`${isMobileSection ? '' : 'hidden md:block'} max-w-2xl mx-auto text-center pt-12`}>
                                        <div className="mb-8 flex justify-center">
                                            {/* Placeholder for the illustration - using a simple div or icon if no image available */}
                                            <div className="flex gap-2 items-end">
                                                <Users className="h-16 w-16 text-gray-800" />
                                            </div>
                                        </div>
                                        <h2 className="text-xl text-gray-600 mb-12">
                                            {t('host.editor.guests.howMany', 'How many guests can fit comfortably in your space?')}
                                        </h2>

                                        <div className="flex items-center justify-center gap-8 mb-12">
                                            <button
                                                onClick={() => {
                                                    const newCount = Math.max(1, listing.max_guests - 1);
                                                    setListing({ ...listing, max_guests: newCount });
                                                }}
                                                disabled={listing.max_guests <= 1}
                                                className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center hover:border-black disabled:opacity-50 disabled:hover:border-gray-300 transition-colors"
                                            >
                                                <Minus className="h-6 w-6 text-gray-600" />
                                            </button>

                                            <span className="text-8xl font-semibold text-gray-900">
                                                {listing.max_guests}
                                            </span>

                                            <button
                                                onClick={() => {
                                                    const newCount = listing.max_guests + 1;
                                                    setListing({ ...listing, max_guests: newCount });
                                                }}
                                                className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center hover:border-black transition-colors"
                                            >
                                                <Plus className="h-6 w-6 text-gray-600" />
                                            </button>
                                        </div>

                                        <div className="flex justify-center">
                                            <Button
                                                onClick={async () => {
                                                    try {
                                                        await apiClient.put(`/listings/${id}`, { max_guests: listing.max_guests });
                                                        // Ideally show a success toast here
                                                    } catch (error) {
                                                        console.error('Failed to update max guests:', error);
                                                    }
                                                }}
                                                className="bg-black text-white hover:bg-gray-800 rounded-lg px-8 py-6 text-lg font-semibold"
                                            >
                                                {t('host.editor.save', 'Save')}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            }

                            {
                                activeSection === 'amenities' && (
                                    <div className={`${isMobileSection ? '' : 'hidden md:block'} max-w-2xl`}>
                                        <div className="flex items-center justify-between mb-8">
                                            <h2 className="text-2xl font-semibold">{t('host.editor.sidebar.amenities', 'Amenities')}</h2>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="rounded-full border-gray-300"
                                                    onClick={() => setShowAddAmenities(true)}
                                                >
                                                    {t('edit', 'Edit')}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="rounded-full border-gray-300 w-10 h-10"
                                                    onClick={() => setShowAddAmenities(true)}
                                                >
                                                    <Plus className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-gray-500 mb-8">
                                            {t('host.editor.amenities.help', "You've added these to your listing so far.")}
                                        </p>

                                        <div className="space-y-6">
                                            {listing.amenities && listing.amenities.length > 0 ? (
                                                listing.amenities.map((amenityKey) => {
                                                    const details = AMENITY_DETAILS[amenityKey];
                                                    if (!details) return null;
                                                    const Icon = details.icon;
                                                    return (
                                                        <div key={amenityKey} className="flex gap-4 pb-6 border-b border-gray-100 last:border-0">
                                                            <Icon className="h-6 w-6 text-gray-500 mt-1" />
                                                            <div>
                                                                <div className="font-medium text-gray-900">{details.label}</div>
                                                                <div className="text-sm text-gray-500">{details.description}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                                    <p className="text-gray-500 mb-4">{t('host.editor.amenities.none', 'No amenities added yet')}</p>
                                                    <Button
                                                        variant="outline"
                                                        className="rounded-full"
                                                        onClick={() => setShowAddAmenities(true)}
                                                    >
                                                        {t('host.editor.amenities.add', 'Add amenities')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            }

                            {
                                activeSection === 'location' && (
                                    <div className={`${isMobileSection ? '' : 'hidden md:block'} max-w-2xl`}>
                                        <div className="mb-8">
                                            <h2 className="text-2xl font-semibold mb-2">{t('host.editor.sidebar.location', 'Location')}</h2>
                                            <p className="text-gray-500">
                                                {t('host.editor.location.help', 'Your exact address will only be shared with confirmed guests.')}
                                            </p>
                                        </div>

                                        {listing.latitude && listing.longitude ? (
                                            <div className="space-y-4">
                                                {/* Map Preview */}
                                                <div className="border rounded-xl overflow-hidden">
                                                    <div className="h-64 bg-gray-100 relative">
                                                        <iframe
                                                            width="100%"
                                                            height="100%"
                                                            frameBorder="0"
                                                            style={{ border: 0 }}
                                                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.longitude - 0.01},${listing.latitude - 0.01},${listing.longitude + 0.01},${listing.latitude + 0.01}&layer=mapnik&marker=${listing.latitude},${listing.longitude}`}
                                                            allowFullScreen
                                                        />
                                                    </div>

                                                    <div className="p-6">
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-gray-900 mb-1">
                                                                    {listing.address || `${listing.city}, ${listing.country}`}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {listing.latitude.toFixed(6)}, {listing.longitude.toFixed(6)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <Button
                                                            variant="outline"
                                                            className="w-full rounded-lg border-gray-300"
                                                            onClick={() => navigate(`/host/location?listing=${id}`)}
                                                        >
                                                            {t('host.editor.location.edit', 'Edit location')}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Additional Location Sections */}
                                                <div className="border rounded-xl divide-y">
                                                    {/* Address */}
                                                    <button
                                                        onClick={() => setShowAddressModal(true)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 mb-1">{t('host.editor.location.address', 'Address')}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {listing.address || `${listing.city}, ${listing.country}`}
                                                            </div>
                                                        </div>
                                                        <ChevronLeft className="h-5 w-5 rotate-180 text-gray-400" />
                                                    </button>

                                                    {/* Location sharing */}
                                                    <button
                                                        onClick={() => setShowLocationSharingModal(true)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 mb-1">{t('host.editor.location.sharing', 'Location sharing')}</div>
                                                            <div className="text-sm text-gray-500">{t('host.editor.location.sharingHelp', "Show listing's general location")}</div>
                                                        </div>
                                                        <ChevronLeft className="h-5 w-5 rotate-180 text-gray-400" />
                                                    </button>

                                                    {/* Neighborhood description */}
                                                    <button
                                                        onClick={() => setShowNeighborhoodModal(true)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 mb-1">{t('host.editor.location.neighborhood', 'Neighborhood description')}</div>
                                                            <div className="text-sm text-gray-500">{t('host.editor.addDetails', 'Add details')}</div>
                                                        </div>
                                                        <ChevronLeft className="h-5 w-5 rotate-180 text-gray-400" />
                                                    </button>



                                                    {/* Scenic views */}
                                                    <button
                                                        onClick={() => setShowScenicViewsModal(true)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 mb-1">{t('host.editor.location.scenicViews', 'Scenic views')}</div>
                                                            <div className="text-sm text-gray-500">{t('host.editor.addDetails', 'Add details')}</div>
                                                        </div>
                                                        <ChevronLeft className="h-5 w-5 rotate-180 text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                                                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                <h3 className="font-semibold text-gray-900 mb-2">{t('host.editor.location.none', 'No location set')}</h3>
                                                <p className="text-gray-500 mb-6">{t('host.editor.location.noneHelp', "Add your property's location to help guests find you.")}</p>
                                                <Button
                                                    className="bg-black text-white hover:bg-gray-800 rounded-lg"
                                                    onClick={() => navigate(`/host/location?listing=${id}`)}
                                                >
                                                    {t('host.editor.location.add', 'Add location')}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )
                            }

                            {
                                activeSection === 'house_rules' && listing && (
                                    <div className={`${isMobileSection ? '' : 'hidden md:block'}`}>
                                        <HouseRulesSection
                                            rules={(() => {
                                                try {
                                                    return listing.house_rules ? JSON.parse(listing.house_rules) : DEFAULT_HOUSE_RULES;
                                                } catch {
                                                    return DEFAULT_HOUSE_RULES;
                                                }
                                            })()}
                                            maxGuests={listing.max_guests || 1}
                                            onRulesChange={async (newRules) => {
                                                const rulesJson = JSON.stringify(newRules);
                                                setListing({ ...listing, house_rules: rulesJson });
                                                try {
                                                    await apiClient.put(`/listings/${id}`, { house_rules: rulesJson });
                                                } catch (error) {
                                                    console.error('Failed to update house rules:', error);
                                                }
                                            }}
                                            onMaxGuestsChange={async (newMaxGuests) => {
                                                setListing({ ...listing, max_guests: newMaxGuests });
                                                try {
                                                    await apiClient.put(`/listings/${id}`, { max_guests: newMaxGuests });
                                                } catch (error) {
                                                    console.error('Failed to update max guests:', error);
                                                }
                                            }}
                                        />
                                    </div>
                                )
                            }

                            {
                                activeSection === 'description' && (() => {
                                    // Parse description sections from JSON or use defaults
                                    const descriptionData = (() => {
                                        try {
                                            return listing.description ? JSON.parse(listing.description) : {
                                                listingDescription: '',
                                                propertyDetails: '',
                                                guestAccess: '',
                                                guestInteraction: '',
                                                otherDetails: ''
                                            };
                                        } catch {
                                            return {
                                                listingDescription: listing.description || '',
                                                propertyDetails: '',
                                                guestAccess: '',
                                                guestInteraction: '',
                                                otherDetails: ''
                                            };
                                        }
                                    })();

                                    const sections = [
                                        {
                                            id: 'listingDescription',
                                            title: 'Listing description',
                                            subtitle: descriptionData.listingDescription || 'Add details',
                                            placeholder: 'Describe your place...',
                                        },
                                        {
                                            id: 'propertyDetails',
                                            title: 'Your property',
                                            subtitle: descriptionData.propertyDetails || 'Add details',
                                            placeholder: 'Share a general description of your property\'s rooms and spaces so guests know what to expect.',
                                        },
                                        {
                                            id: 'guestAccess',
                                            title: 'Guest access',
                                            subtitle: descriptionData.guestAccess || 'Add details',
                                            placeholder: 'Describe what areas guests can access...',
                                        },
                                        {
                                            id: 'guestInteraction',
                                            title: 'Interaction with guests',
                                            subtitle: descriptionData.guestInteraction || 'Add details',
                                            placeholder: 'Describe how you\'ll interact with guests...',
                                        },
                                        {
                                            id: 'otherDetails',
                                            title: 'Other details to note',
                                            subtitle: descriptionData.otherDetails || 'Add details',
                                            placeholder: 'Add any other important details...',
                                        },
                                    ];

                                    const handleSaveSection = async () => {
                                        const updatedData = { ...descriptionData, [editingDescriptionSection!]: tempDescription };
                                        const jsonString = JSON.stringify(updatedData);

                                        setListing({ ...listing, description: jsonString });

                                        try {
                                            await apiClient.put(`/listings/${id}`, { description: jsonString });
                                            setEditingDescriptionSection(null);
                                        } catch (error) {
                                            console.error('Failed to update description:', error);
                                        }
                                    };

                                    return (
                                        <div className={`${isMobileSection ? '' : 'hidden md:block'}`}>
                                            <div className="max-w-2xl">
                                                <div className="mb-8">
                                                    <h2 className="text-2xl font-semibold mb-2">Description</h2>
                                                </div>

                                                <div className="space-y-0 border border-gray-200 rounded-xl overflow-hidden">
                                                    {sections.map((section, index) => (
                                                        <button
                                                            key={section.id}
                                                            onClick={() => {
                                                                setEditingDescriptionSection(section.id);
                                                                setTempDescription(descriptionData[section.id as keyof typeof descriptionData] || '');
                                                            }}
                                                            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ${index !== sections.length - 1 ? 'border-b border-gray-200' : ''
                                                                }`}
                                                        >
                                                            <div className="flex-1">
                                                                <div className="font-medium text-gray-900 mb-1">{section.title}</div>
                                                                <div className="text-sm text-gray-500 line-clamp-1">{section.subtitle}</div>
                                                            </div>
                                                            <ChevronLeft className="h-5 w-5 rotate-180 text-gray-400 flex-shrink-0 ml-4" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Modal for editing */}
                                            {editingDescriptionSection && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                                                        {/* Modal Header */}
                                                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                                            <button
                                                                onClick={() => setEditingDescriptionSection(null)}
                                                                className="p-2 hover:bg-gray-100 rounded-full -ml-2"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                            <h3 className="text-base font-semibold absolute left-1/2 -translate-x-1/2">
                                                                {sections.find(s => s.id === editingDescriptionSection)?.title}
                                                            </h3>
                                                            <div className="w-8" />
                                                        </div>

                                                        {/* Modal Body */}
                                                        <div className="flex-1 overflow-y-auto p-6">
                                                            {editingDescriptionSection === 'propertyDetails' && (
                                                                <p className="text-sm text-gray-600 mb-4">
                                                                    Share a general description of your property's rooms and spaces so guests know what to expect.
                                                                </p>
                                                            )}
                                                            <div className="mb-2">
                                                                <div className="text-xs text-gray-500 mb-2">
                                                                    {tempDescription.length}/500 available
                                                                </div>
                                                                <textarea
                                                                    value={tempDescription}
                                                                    onChange={(e) => {
                                                                        if (e.target.value.length <= 500) {
                                                                            setTempDescription(e.target.value);
                                                                        }
                                                                    }}
                                                                    className="w-full min-h-[400px] text-base border-none p-0 resize-none focus:ring-0 focus:outline-none placeholder-gray-400"
                                                                    placeholder={sections.find(s => s.id === editingDescriptionSection)?.placeholder}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Modal Footer */}
                                                        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                                                            <button
                                                                onClick={() => setEditingDescriptionSection(null)}
                                                                className="text-base font-medium text-gray-900 hover:underline"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <Button
                                                                onClick={handleSaveSection}
                                                                disabled={tempDescription.length === 0}
                                                                className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Save
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                            }

                            {
                                activeSection === 'guest_safety' && listing && (
                                    <div className={`${isMobileSection ? '' : 'hidden md:block'} max-w-2xl`}>
                                        <div className="flex items-center justify-between mb-8">
                                            <h2 className="text-2xl font-semibold">{t('host.editor.sidebar.guestSafety', 'Guest safety')}</h2>
                                        </div>

                                        {/* Safety summary cards */}
                                        <div className="space-y-4 mb-8">
                                            {(listing.safety_items || []).filter(id => !SAFETY_DEVICES.some(device => device.id === id)).length === 0 && (
                                                <div className="p-4 border border-gray-200 rounded-xl">
                                                    <div className="font-medium text-gray-900 mb-1">{t('host.editor.safety.coAlarmMissing', 'Carbon monoxide alarm not reported')}</div>
                                                </div>
                                            )}
                                            {!(listing.safety_items || []).some(id => id === 'smoke_alarm') && (
                                                <div className="p-4 border border-gray-200 rounded-xl">
                                                    <div className="font-medium text-gray-900 mb-1">{t('host.editor.safety.smokeAlarmMissing', 'Smoke alarm not reported')}</div>
                                                </div>
                                            )}
                                            {(listing.safety_items || []).some(id => id === 'noise_decibel_monitor') && (
                                                <div className="p-4 border border-gray-200 rounded-xl">
                                                    <div className="font-medium text-gray-900 mb-1">{t('host.editor.safety.noiseMonitorPresent', 'Noise decibel monitor present')}</div>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-gray-500 mb-6">
                                            {t('host.editor.safety.help', 'The safety devices and considerations you share with guests help them make informed decisions when booking your property.')}
                                        </p>

                                        {/* Action buttons */}
                                        <div className="space-y-4">
                                            <button
                                                onClick={() => {
                                                    setGuestSafetySection('considerations');
                                                    setShowGuestSafety(true);
                                                }}
                                                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900 mb-1">{t('host.editor.safety.considerations', 'Safety considerations')}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {(listing.safety_items || []).filter(id => SAFETY_CONSIDERATIONS.some(c => c.id === id)).length > 0
                                                            ? `${(listing.safety_items || []).filter(id => SAFETY_CONSIDERATIONS.some(c => c.id === id)).length} ${t('common.selected', 'selected')}`
                                                            : t('host.editor.addDetails', 'Add details')}
                                                    </div>
                                                </div>
                                                <ChevronLeft className="h-5 w-5 rotate-180 text-gray-400" />
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setGuestSafetySection('devices');
                                                    setShowGuestSafety(true);
                                                }}
                                                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900 mb-1">{t('host.editor.safety.devices', 'Safety devices')}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {(listing.safety_items || []).filter(id => SAFETY_DEVICES.some(d => d.id === id)).length > 0
                                                            ? `${(listing.safety_items || []).filter(id => SAFETY_DEVICES.some(d => d.id === id)).length} ${t('common.selected', 'selected')}`
                                                            : t('host.editor.safety.noiseMonitorPresent', 'Noise decibel monitor present')}
                                                    </div>
                                                </div>
                                                <ChevronLeft className="h-5 w-5 rotate-180 text-gray-400" />
                                            </button>


                                        </div>
                                    </div>
                                )
                            }

                            {
                                activeSection === 'cancellation_policy' && listing && (
                                    <div className={`${isMobileSection ? '' : 'hidden md:block'} max-w-2xl`}>
                                        <div className="mb-8">
                                            <h2 className="text-2xl font-semibold mb-2">{t('host.editor.sidebar.cancellationPolicy', 'Cancellation policy')}</h2>
                                            <p className="text-gray-500">
                                                {t('host.editor.cancellation.help', 'Choose a policy that works for you and your guests.')}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {cancellationPolicies.map((policy) => (
                                                <div
                                                    key={policy.id}
                                                    className={`p-4 border rounded-xl cursor-pointer transition-all ${listing.cancellation_policy === policy.id
                                                        ? 'border-black ring-1 ring-black bg-gray-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    onClick={async () => {
                                                        setListing({ ...listing, cancellation_policy: policy.id });
                                                        try {
                                                            await apiClient.put(`/listings/${id}`, { cancellation_policy: policy.id });
                                                        } catch (error) {
                                                            console.error('Failed to update cancellation policy:', error);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="font-medium text-gray-900 mb-1">{policy.label}</div>
                                                            <div className="text-sm text-gray-500">{policy.description}</div>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${listing.cancellation_policy === policy.id
                                                            ? 'border-black'
                                                            : 'border-gray-300'
                                                            }`}>
                                                            {listing.cancellation_policy === policy.id && (
                                                                <div className="w-2.5 h-2.5 bg-black rounded-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }

                            {
                                photoView === 'overview' && !isMobileSection && activeSection !== 'photos' && activeSection !== 'title' && activeSection !== 'description' && activeSection !== 'pricing' && activeSection !== 'availability' && activeSection !== 'number_of_guests' && activeSection !== 'amenities' && activeSection !== 'house_rules' && activeSection !== 'guest_safety' && activeSection !== 'cancellation_policy' && (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        Select a section to edit
                                    </div>
                                )
                            }
                        </div >
                    </main >

                    {/* Mobile bottom View button (Mboko style) */}
                    {
                        photoView === 'overview' && !isMobileSection && (
                            <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]">
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 text-white shadow-lg"
                                >
                                    <Eye className="h-5 w-5" />
                                    <span className="font-medium">View</span>
                                </button>
                            </div>
                        )
                    }
                </div >

                {/* Listing Preview Modal */}
                {
                    listing && (
                        <ListingPreview
                            listing={listing}
                            isOpen={showPreview}
                            onClose={() => setShowPreview(false)}
                        />
                    )
                }

                {
                    showAddAmenities && listing && (
                        <AddAmenitiesPanel
                            selectedAmenities={listing.amenities || []}
                            onToggle={async (amenityId) => {
                                const currentAmenities = listing.amenities || [];
                                const newAmenities = currentAmenities.includes(amenityId)
                                    ? currentAmenities.filter(id => id !== amenityId)
                                    : [...currentAmenities, amenityId];

                                setListing({ ...listing, amenities: newAmenities });

                                // Save to backend using the correct amenities endpoint
                                try {
                                    await apiClient.post(`/listings/${id}/amenities`, { amenities: newAmenities });
                                } catch (error) {
                                    console.error('Failed to update amenities:', error);
                                    // Revert on failure
                                    setListing({ ...listing, amenities: currentAmenities });
                                }
                            }}
                            onClose={() => setShowAddAmenities(false)}
                        />
                    )
                }

                {
                    showGuestSafety && listing && (
                        <GuestSafetyModal
                            isOpen={showGuestSafety}
                            onClose={() => setShowGuestSafety(false)}
                            selectedItems={listing.safety_items || []}
                            initialSection={guestSafetySection}
                            onSave={async (items) => {
                                setListing({ ...listing, safety_items: items });

                                // Save to backend
                                try {
                                    await apiClient.put(`/listings/${id}`, { safety_items: items });
                                } catch (error) {
                                    console.error('Failed to update safety items:', error);
                                    // Revert on failure
                                    setListing({ ...listing, safety_items: listing.safety_items || [] });
                                }
                            }}
                        />
                    )
                }

                {/* Location Detail Modals */}
                <LocationDetailModals
                    showAddressModal={showAddressModal}
                    onCloseAddressModal={() => setShowAddressModal(false)}
                    address={listing?.address || ''}
                    city={listing?.city || ''}
                    country={listing?.country || ''}
                    onSaveAddress={async (data) => {
                        if (!listing) return;
                        setListing({ ...listing, ...data });
                        try {
                            await apiClient.put(`/listings/${id}`, data);
                        } catch (error) {
                            console.error('Failed to update address:', error);
                        }
                    }}
                    showNeighborhoodModal={showNeighborhoodModal}
                    onCloseNeighborhoodModal={() => setShowNeighborhoodModal(false)}
                    neighborhoodDescription={neighborhoodDescription}
                    onSaveNeighborhood={async (description) => {
                        setNeighborhoodDescription(description);
                        try {
                            await apiClient.put(`/listings/${id}`, { neighborhood_description: description });
                        } catch (error) {
                            console.error('Failed to update neighborhood description:', error);
                        }
                    }}
                    showGettingAroundModal={showGettingAroundModal}
                    onCloseGettingAroundModal={() => setShowGettingAroundModal(false)}
                    gettingAroundDescription={gettingAroundDescription}
                    onSaveGettingAround={async (description) => {
                        setGettingAroundDescription(description);
                        try {
                            await apiClient.put(`/listings/${id}`, { getting_around: description });
                        } catch (error) {
                            console.error('Failed to update getting around:', error);
                        }
                    }}
                    showScenicViewsModal={showScenicViewsModal}
                    onCloseScenicViewsModal={() => setShowScenicViewsModal(false)}
                    scenicViews={scenicViews}
                    onSaveScenicViews={async (views) => {
                        setScenicViews(views);
                        try {
                            await apiClient.put(`/listings/${id}`, { scenic_views: views });
                        } catch (error) {
                            console.error('Failed to update scenic views:', error);
                        }
                    }}
                    showLocationSharingModal={showLocationSharingModal}
                    onCloseLocationSharingModal={() => setShowLocationSharingModal(false)}
                    showGeneralLocation={showGeneralLocation}
                    onSaveLocationSharing={async (show) => {
                        setShowGeneralLocation(show);
                        try {
                            await apiClient.put(`/listings/${id}`, { show_general_location: show });
                        } catch (error) {
                            console.error('Failed to update location sharing:', error);
                        }
                    }}
                />

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        setUploading(true);
                        try {
                            // First, get all existing photos from the listing
                            const listingResponse = await apiClient.get(`/listings/${id}`);
                            const allExistingPhotos = listingResponse.data.photos || [];

                            // Upload new photos
                            const uploadedUrls: string[] = [];
                            for (const file of Array.from(files)) {
                                const formData = new FormData();
                                formData.append('file', file);

                                const response = await apiClient.post('/upload/images', formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });

                                uploadedUrls.push(response.data.urls[0]);
                            }

                            // Prepare the complete photos array (existing + new)
                            const existingPhotosData = (allExistingPhotos as Array<{ url: string; caption: string; room_type: string | null; is_cover: number | boolean; display_order: number }>).map((p) => ({
                                url: p.url,
                                caption: p.caption,
                                room_type: p.room_type,
                                is_cover: p.is_cover === 1,
                                display_order: p.display_order
                            }));

                            const newPhotosData = uploadedUrls.map(url => ({
                                url,
                                caption: 'Additional photo',
                                room_type: null,
                                is_cover: false,
                                display_order: 0
                            }));

                            // Sync all photos (existing + new)
                            await apiClient.post(`/listings/${id}/photos`, {
                                photos: [...existingPhotosData, ...newPhotosData]
                            });

                            // Refresh listing to show new photos
                            const updatedListing = await apiClient.get(`/listings/${id}`);
                            setListing(updatedListing.data);
                        } catch (error) {
                            console.error('Upload failed:', error);
                        } finally {
                            setUploading(false);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                        }
                    }}
                    className="hidden"
                />

                {/* All Photos Modal */}
                {
                    showAllPhotos && listing && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-2xl font-semibold">All photos ({listing.photos.length})</h2>
                                    <button
                                        onClick={() => setShowAllPhotos(false)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    {listing.photos.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {listing.photos.map((photo) => (
                                                <div
                                                    key={photo.id}
                                                    className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => openLightbox(photo.url)}
                                                >
                                                    <img
                                                        src={getImageUrl(photo.url)}
                                                        alt={photo.caption || 'Listing photo'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            No photos uploaded yet
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 border-t border-gray-200 flex justify-end">
                                    <Button
                                        onClick={() => setShowAllPhotos(false)}
                                        className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Photo Lightbox */}
                {
                    selectedPhoto && (
                        <div
                            className="fixed inset-0 bg-black z-[60] flex items-center justify-center p-4 md:p-8"
                            onClick={() => setSelectedPhoto(null)}
                            onTouchStart={(e) => { lightboxTouchStartX.current = e.touches[0].clientX; }}
                            onTouchEnd={(e) => {
                                const startX = lightboxTouchStartX.current;
                                const endX = e.changedTouches[0].clientX;
                                if (startX !== null) {
                                    const dx = endX - startX;
                                    if (Math.abs(dx) > 40) {
                                        if (dx > 0) showPrevPhoto(); else showNextPhoto();
                                    }
                                }
                                lightboxTouchStartX.current = null;
                            }}
                        >
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute top-4 left-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
                            >
                                <X className="h-6 w-6" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); showPrevPhoto(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); showNextPhoto(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                            <img
                                src={getImageUrl(selectedPhoto)}
                                alt="Full size view"
                                className="w-full h-full object-contain"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )
                }
            </div >

            {/* Mobile Bottom Nav */}
            < nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 pb-safe" >
                <div className="max-w-7xl mx-auto px-6">
                    <ul className="grid grid-cols-4 h-16 text-xs">
                        <li className="flex items-center justify-center">
                            <a href="/host/reservations" className="flex flex-col items-center gap-1 text-gray-600">
                                <Home className="h-5 w-5" />
                                <span>reservations</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <a href="/host/dashboard" className="flex flex-col items-center gap-1 text-gray-900 font-medium">
                                <Grid3x3 className="h-5 w-5" />
                                <span>Listings</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <a href="#" className="flex flex-col items-center gap-1 text-gray-600">
                                <Mail className="h-5 w-5" />
                                <span>Messages</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </nav >
        </>
    );
};

export default ListingEditor;
