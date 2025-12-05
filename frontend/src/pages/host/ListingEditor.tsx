import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, Minus, Settings, Home, MapPin, Users, Key, BookOpen, Shield, FileText, Link as LinkIcon, Camera, Eye } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { AMENITY_DETAILS } from '@/data/amenities';
import AddAmenitiesPanel from '@/components/host/AddAmenitiesPanel';
import HouseRulesSection, { HouseRules, DEFAULT_HOUSE_RULES } from '@/components/host/HouseRulesSection';
import ListingPreview from '@/components/host/ListingPreview';
import GuestSafetyModal from '@/components/host/GuestSafetyModal';
import { SAFETY_CONSIDERATIONS, SAFETY_DEVICES, PROPERTY_INFO } from '@/data/guestSafety';

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
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('photos');
    const [photoView, setPhotoView] = useState<'overview' | 'bedroom' | 'bathroom' | 'additional'>('overview');
    const [settings, setSettings] = useState<ListingSettings | null>(null);
    const [showAddAmenities, setShowAddAmenities] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [editingDescriptionSection, setEditingDescriptionSection] = useState<string | null>(null);
    const [tempDescription, setTempDescription] = useState('');
    const [showGuestSafety, setShowGuestSafety] = useState(false);
    const [guestSafetySection, setGuestSafetySection] = useState<'considerations' | 'devices' | 'property_info'>('considerations');

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const response = await apiClient.get(`/listings/${id}`);
                setListing(response.data.listing ? { ...response.data.listing, photos: response.data.photos || [] } : null);
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
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!listing) {
        return <div className="min-h-screen flex items-center justify-center">Listing not found</div>;
    }

    const sidebarItems = [
        { id: 'photos', label: 'Photos', icon: Camera, description: 'Add at least 5 photos' },
        { id: 'title', label: 'Title', icon: FileText, description: listing?.title || 'Add a title' },
        {
            id: 'description',
            label: 'Description',
            icon: null,
            description: (() => {
                try {
                    const parsed = listing?.description ? JSON.parse(listing.description) : null;
                    return parsed?.listingDescription || 'Add a description';
                } catch {
                    return listing?.description || 'Add a description';
                }
            })()
        },
        { id: 'pricing', label: 'Pricing', icon: null, description: `$${listing.price_per_night} per night` },
        { id: 'availability', label: 'Availability', icon: null, description: '1 – 365 night stays' },
        { id: 'number_of_guests', label: 'Number of guests', icon: Users, description: `${listing.max_guests} guests` },
        {
            id: 'amenities', label: 'Amenities', icon: Plus, description: listing.amenities && listing.amenities.length > 0
                ? listing.amenities.slice(0, 2).map(id => AMENITY_DETAILS[id]?.label).join(' · ') + (listing.amenities.length > 2 ? ` +${listing.amenities.length - 2} more` : '')
                : 'Add details'
        },
        { id: 'house_rules', label: 'House rules', icon: BookOpen, description: 'Guests must agree to your rules' },
        {
            id: 'guest_safety',
            label: 'Guest safety',
            icon: Shield,
            description: (() => {
                const safetyItems = listing?.safety_items || [];
                const deviceCount = safetyItems.filter(id => SAFETY_DEVICES.some(d => d.id === id)).length;
                if (deviceCount > 0) return `${deviceCount} safety device${deviceCount > 1 ? 's' : ''}`;
                return 'Add safety information';
            })()
        },
    ];

    const photoSidebarItems = [
        { id: 'bedroom', label: 'Bedroom', image: '/bedroom-placeholder.jpg' },
        { id: 'bathroom', label: 'Full bathroom', image: '/bathroom-placeholder.jpg' },
        { id: 'additional', label: 'Additional photos', image: listing.photos.length > 0 ? getImageUrl(listing.photos[0].url) : null },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 bg-white z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => photoView === 'overview' ? navigate('/host/dashboard') : setPhotoView('overview')}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-lg font-semibold">
                        {photoView === 'overview' ? 'Listing editor' : 'Photo tour'}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* Add any header actions here if needed */}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-80 border-r border-gray-200 overflow-y-auto h-[calc(100vh-64px)] pb-10">
                    <div className="p-6">
                        {photoView === 'overview' ? (
                            <>
                                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full mb-8 w-fit">
                                    <button className="px-4 py-1.5 bg-white rounded-full text-sm font-semibold shadow-sm">Your space</button>
                                </div>

                                <div className="mb-8 border border-gray-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                                            <span className="font-semibold text-sm">Complete required steps</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Finish these final tasks to publish your listing and start getting booked.</p>
                                    </div>
                                    <ChevronLeft className="h-4 w-4 rotate-180 text-gray-400" />
                                </div>

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
                                        View
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6">
                                {photoSidebarItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setPhotoView(item.id as any)}
                                        className="w-full group flex flex-col items-center text-center"
                                    >
                                        <div className={`w-24 h-24 rounded-xl overflow-hidden mb-2 border-2 transition-all ${photoView === item.id ? 'border-black ring-1 ring-black' : 'border-transparent group-hover:scale-105'
                                            }`}>
                                            {item.image ? (
                                                <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
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
                <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] p-12">
                    <div className="max-w-4xl mx-auto">
                        {photoView === 'overview' ? (
                            activeSection === 'photos' && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-2xl font-semibold">Photo tour</h2>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="rounded-full border-gray-300">All photos</Button>
                                            <Button variant="outline" size="icon" className="rounded-full border-gray-300 w-10 h-10">
                                                <Plus className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-gray-500 mb-8 max-w-2xl">
                                        Manage photos and add details. Guests will only see your tour if every room has a photo.
                                    </p>

                                    <div className="grid grid-cols-3 gap-6">
                                        {/* Bedroom Card */}
                                        <div className="group cursor-pointer" onClick={() => setPhotoView('bedroom')}>
                                            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3 relative">
                                                <div className="w-full h-full flex items-center justify-center bg-white">
                                                    <img src="/bedroom-placeholder.jpg" alt="Bedroom placeholder" className="w-full h-full object-contain p-4" />
                                                </div>
                                            </div>
                                            <h3 className="font-semibold text-gray-900">Bedroom</h3>
                                            <p className="text-sm text-gray-500">Add photos</p>
                                        </div>

                                        {/* Full Bathroom Card */}
                                        <div className="group cursor-pointer" onClick={() => setPhotoView('bathroom')}>
                                            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3 relative">
                                                <div className="w-full h-full flex items-center justify-center bg-white">
                                                    <img src="/bathroom-placeholder.jpg" alt="Bathroom placeholder" className="w-full h-full object-contain p-4" />
                                                </div>
                                            </div>
                                            <h3 className="font-semibold text-gray-900">Full bathroom</h3>
                                            <p className="text-sm text-gray-500">Add photos</p>
                                        </div>

                                        {/* Additional Photos Card */}
                                        <div className="group cursor-pointer" onClick={() => setPhotoView('additional')}>
                                            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3 relative border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors">
                                                {listing.photos.length > 0 ? (
                                                    <img src={getImageUrl(listing.photos[0].url)} alt="Additional" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center">
                                                        <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                                        <span className="text-sm font-medium text-gray-600">Add photos</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-gray-900">Additional photos</h3>
                                            <p className="text-sm text-gray-500">{listing.photos.length} photos</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-2xl font-semibold">
                                        {photoView === 'bedroom' ? 'Bedroom' :
                                            photoView === 'bathroom' ? 'Full bathroom' : 'Additional photos'}
                                    </h2>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="rounded-full border-gray-300">Manage photos</Button>
                                        <Button variant="outline" size="icon" className="rounded-full border-gray-300 w-10 h-10">
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-gray-500 mb-8 max-w-2xl">
                                    {photoView === 'additional'
                                        ? "These photos aren't included in a room or space, but they'll still appear in your listing."
                                        : "Add photos to this room to complete your photo tour."}
                                </p>

                                <div className="grid grid-cols-3 gap-4">
                                    {photoView === 'additional' && listing.photos.map((photo) => (
                                        <div key={photo.id} className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 relative group">
                                            <img src={getImageUrl(photo.url)} alt={photo.caption} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {/* Placeholders for empty states if no photos */}
                                    {photoView === 'additional' && listing.photos.length === 0 && (
                                        <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                            <p className="text-gray-500">No photos uploaded yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Placeholders for other sections */}
                        {activeSection === 'title' && (
                            <div className="max-w-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-semibold">Title</h2>
                                </div>
                                <p className="text-gray-500 mb-8">
                                    Your title should highlight what makes your place special.
                                </p>
                                <div className="mb-8">
                                    <textarea
                                        value={listing.title}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 50) {
                                                setListing({ ...listing, title: e.target.value });
                                            }
                                        }}
                                        className="w-full text-3xl font-semibold border-none focus:ring-0 p-0 resize-none placeholder-gray-300"
                                        rows={2}
                                        placeholder="Add a title"
                                    />
                                    <div className="text-sm text-gray-500 mt-2">
                                        {listing.title.length}/50
                                    </div>
                                </div>
                                <div className="flex justify-end border-t pt-6">
                                    <Button
                                        onClick={async () => {
                                            try {
                                                await apiClient.put(`/listings/${id}`, { title: listing.title });
                                                // Show success message or toast
                                            } catch (error) {
                                                console.error('Failed to update title:', error);
                                            }
                                        }}
                                        className="bg-black text-white hover:bg-gray-800 rounded-lg px-6"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeSection === 'pricing' && settings && (
                            <div className="max-w-2xl">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-semibold mb-2">Pricing</h2>
                                    <p className="text-gray-500">
                                        These settings apply to all nights, unless you customize them by date. <a href="#" className="underline font-medium text-black">Learn more</a>
                                    </p>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-lg">Nightly price</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Smart Pricing</span>
                                            <div
                                                className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.smart_pricing_enabled ? 'bg-black' : 'bg-gray-300'}`}
                                                onClick={() => setSettings({ ...settings, smart_pricing_enabled: settings.smart_pricing_enabled ? 0 : 1 })}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.smart_pricing_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold">$</span>
                                        <input
                                            type="number"
                                            value={listing.price_per_night}
                                            onChange={(e) => setListing({ ...listing, price_per_night: parseInt(e.target.value) || 0 })}
                                            className="w-full text-3xl font-semibold pl-8 py-4 border rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="mb-8 p-4 border rounded-xl flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500 mb-1">Custom weekend price</div>
                                        <div className="text-xl font-semibold">${settings.weekend_price || listing.price_per_night}</div>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, weekend_price: undefined })}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                                    >
                                        <div className="h-5 w-5 flex items-center justify-center border border-current rounded">
                                            <div className="w-3 h-px bg-current" />
                                        </div>
                                    </button>
                                </div>

                                <div className="mb-8">
                                    <h3 className="font-semibold text-lg mb-4">Discounts</h3>

                                    <div className="border rounded-xl divide-y">
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">Weekly <span className="text-gray-500 font-normal">· For 7 nights or more</span></div>
                                                <div className="flex items-center mt-1">
                                                    <input
                                                        type="number"
                                                        value={settings.weekly_discount}
                                                        onChange={(e) => setSettings({ ...settings, weekly_discount: parseInt(e.target.value) || 0 })}
                                                        className="text-2xl font-semibold w-16 border-b border-gray-300 focus:border-black focus:ring-0 p-0 text-center"
                                                        min="0"
                                                        max="99"
                                                    />
                                                    <span className="text-2xl font-semibold ml-1">%</span>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-500">Weekly average is ${Math.round(listing.price_per_night * 7 * (1 - settings.weekly_discount / 100))}</div>
                                        </div>

                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">Monthly <span className="text-gray-500 font-normal">· For 28 nights or more</span></div>
                                                <div className="flex items-center mt-1">
                                                    <input
                                                        type="number"
                                                        value={settings.monthly_discount}
                                                        onChange={(e) => setSettings({ ...settings, monthly_discount: parseInt(e.target.value) || 0 })}
                                                        className="text-2xl font-semibold w-16 border-b border-gray-300 focus:border-black focus:ring-0 p-0 text-center"
                                                        min="0"
                                                        max="99"
                                                    />
                                                    <span className="text-2xl font-semibold ml-1">%</span>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-500">Monthly average is ${Math.round(listing.price_per_night * 28 * (1 - settings.monthly_discount / 100))}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-2 text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors mb-8">
                                    <FileText className="h-4 w-4" />
                                    Find more discounts and fees in the calendar
                                </div>

                                <div className="flex justify-end border-t pt-6">
                                    <Button
                                        onClick={async () => {
                                            try {
                                                // Update listing price
                                                await apiClient.put(`/listings/${id}`, { price_per_night: listing.price_per_night });

                                                // Update settings
                                                await apiClient.put(`/calendar/${id}/settings`, {
                                                    ...settings,
                                                    weekend_price: settings.weekend_price,
                                                    smart_pricing_enabled: settings.smart_pricing_enabled,
                                                    weekly_discount: settings.weekly_discount,
                                                    monthly_discount: settings.monthly_discount
                                                });
                                                // Show success message or toast
                                            } catch (error) {
                                                console.error('Failed to update pricing:', error);
                                            }
                                        }}
                                        className="bg-black text-white hover:bg-gray-800 rounded-lg px-6"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeSection === 'availability' && settings && (
                            <div className="max-w-2xl">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-semibold mb-2">Availability</h2>
                                    <p className="text-gray-500">
                                        These settings apply to all nights, unless you customize them by date.
                                    </p>
                                </div>

                                {/* Trip Length */}
                                <div className="mb-8">
                                    <h3 className="text-base font-semibold text-gray-900 mb-4">Trip length</h3>

                                    <div className="space-y-4">
                                        <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                            <label className="block text-sm text-gray-600 mb-2">Minimum nights</label>
                                            <input
                                                type="number"
                                                value={settings.min_nights}
                                                onChange={(e) => setSettings({ ...settings, min_nights: Number(e.target.value) })}
                                                className="text-3xl font-semibold border-none bg-transparent p-0 w-20 focus:outline-none focus:ring-0"
                                                min={1}
                                            />
                                        </div>

                                        <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                            <label className="block text-sm text-gray-600 mb-2">Maximum nights</label>
                                            <input
                                                type="number"
                                                value={settings.max_nights}
                                                onChange={(e) => setSettings({ ...settings, max_nights: Number(e.target.value) })}
                                                className="text-3xl font-semibold border-none bg-transparent p-0 w-24 focus:outline-none focus:ring-0"
                                                min={1}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Advance Notice */}
                                <div className="mb-8">
                                    <h3 className="text-base font-semibold text-gray-900 mb-1">Advance notice</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        How much notice do you need between a guest's booking and their arrival?
                                    </p>

                                    <div className="space-y-4">
                                        <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                            <label className="block text-sm text-gray-600 mb-3">Days</label>
                                            <div className="relative">
                                                <select
                                                    value={settings.advance_notice}
                                                    onChange={(e) => setSettings({ ...settings, advance_notice: e.target.value })}
                                                    className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                                                >
                                                    <option value="same_day">Same day</option>
                                                    <option value="1_day">1 day</option>
                                                    <option value="2_days">2 days</option>
                                                    <option value="3_days">3 days</option>
                                                    <option value="4_days">4 days</option>
                                                    <option value="5_days">5 days</option>
                                                    <option value="6_days">6 days</option>
                                                    <option value="7_days">7 days</option>
                                                </select>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-3">
                                                Guests can book on the same day as check-in until this time.
                                            </p>
                                        </div>

                                        <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                            <label className="block text-sm text-gray-600 mb-3">Time</label>
                                            <div className="relative">
                                                <select
                                                    value={settings.same_day_cutoff_time}
                                                    onChange={(e) => setSettings({ ...settings, same_day_cutoff_time: e.target.value })}
                                                    className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                                                >
                                                    {Array.from({ length: 24 }, (_, i) => {
                                                        const hour = i.toString().padStart(2, '0');
                                                        return `${hour}:00`;
                                                    }).map((time) => (
                                                        <option key={time} value={time}>
                                                            {time}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-3">
                                                Guests can book on the same day as check-in until this time.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Preparation Time */}
                                <div className="mb-8">
                                    <h3 className="text-base font-semibold text-gray-900 mb-1">Preparation time</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Block time before and after each reservation to prepare your space.
                                    </p>

                                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                        <div className="relative">
                                            <select
                                                value={settings.preparation_time}
                                                onChange={(e) => setSettings({ ...settings, preparation_time: e.target.value })}
                                                className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                                            >
                                                <option value="none">None</option>
                                                <option value="1_night">1 night before and after each reservation</option>
                                                <option value="2_nights">2 nights before and after each reservation</option>
                                            </select>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Availability Window */}
                                <div className="mb-8">
                                    <h3 className="text-base font-semibold text-gray-900 mb-1">Availability window</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        How far in advance can guests book?
                                    </p>

                                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                                        <div className="relative">
                                            <select
                                                value={settings.availability_window}
                                                onChange={(e) => setSettings({ ...settings, availability_window: Number(e.target.value) })}
                                                className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                                            >
                                                <option value={3}>3 months in advance</option>
                                                <option value={6}>6 months in advance</option>
                                                <option value={9}>9 months in advance</option>
                                                <option value={12}>12 months in advance</option>
                                                <option value={24}>24 months in advance</option>
                                            </select>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
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
                            </div>
                        )}

                        {activeSection === 'number_of_guests' && (
                            <div className="max-w-2xl mx-auto text-center pt-12">
                                <div className="mb-8 flex justify-center">
                                    {/* Placeholder for the illustration - using a simple div or icon if no image available */}
                                    <div className="flex gap-2 items-end">
                                        <Users className="h-16 w-16 text-gray-800" />
                                    </div>
                                </div>
                                <h2 className="text-xl text-gray-600 mb-12">
                                    How many guests can fit comfortably in your space?
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
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeSection === 'amenities' && (
                            <div className="max-w-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-semibold">Amenities</h2>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="rounded-full border-gray-300"
                                            onClick={() => setShowAddAmenities(true)}
                                        >
                                            Edit
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
                                    You've added these to your listing so far.
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
                                            <p className="text-gray-500 mb-4">No amenities added yet</p>
                                            <Button
                                                variant="outline"
                                                className="rounded-full"
                                                onClick={() => setShowAddAmenities(true)}
                                            >
                                                Add amenities
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeSection === 'house_rules' && listing && (
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
                        )}

                        {activeSection === 'description' && (() => {
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
                                <>
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
                                </>
                            );
                        })()}

                        {activeSection === 'guest_safety' && listing && (
                            <div className="max-w-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-semibold">Guest safety</h2>
                                </div>

                                {/* Safety summary cards */}
                                <div className="space-y-4 mb-8">
                                    {(listing.safety_items || []).filter(id => !SAFETY_DEVICES.some(device => device.id === id)).length === 0 && (
                                        <div className="p-4 border border-gray-200 rounded-xl">
                                            <div className="font-medium text-gray-900 mb-1">Carbon monoxide alarm not reported</div>
                                        </div>
                                    )}
                                    {!(listing.safety_items || []).some(id => id === 'smoke_alarm') && (
                                        <div className="p-4 border border-gray-200 rounded-xl">
                                            <div className="font-medium text-gray-900 mb-1">Smoke alarm not reported</div>
                                        </div>
                                    )}
                                    {(listing.safety_items || []).some(id => id === 'noise_decibel_monitor') && (
                                        <div className="p-4 border border-gray-200 rounded-xl">
                                            <div className="font-medium text-gray-900 mb-1">Noise decibel monitor present</div>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-500 mb-6">
                                    The safety devices and considerations you share with guests help them make informed decisions when booking your property.
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
                                            <div className="font-medium text-gray-900 mb-1">Safety considerations</div>
                                            <div className="text-sm text-gray-500">Add details</div>
                                        </div>
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setGuestSafetySection('devices');
                                            setShowGuestSafety(true);
                                        }}
                                        className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900 mb-1">Safety devices</div>
                                            <div className="text-sm text-gray-500">
                                                {(listing.safety_items || []).filter(id => SAFETY_DEVICES.some(d => d.id === id)).length > 0
                                                    ? `${(listing.safety_items || []).filter(id => SAFETY_DEVICES.some(d => d.id === id)).length} selected`
                                                    : 'Noise decibel monitor present'}
                                            </div>
                                        </div>
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setGuestSafetySection('property_info');
                                            setShowGuestSafety(true);
                                        }}
                                        className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900 mb-1">Property info</div>
                                            <div className="text-sm text-gray-500">Add details</div>
                                        </div>
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {photoView === 'overview' && activeSection !== 'photos' && activeSection !== 'title' && activeSection !== 'description' && activeSection !== 'pricing' && activeSection !== 'availability' && activeSection !== 'number_of_guests' && activeSection !== 'amenities' && activeSection !== 'house_rules' && activeSection !== 'guest_safety' && (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Select a section to edit
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Listing Preview Modal */}
            {listing && (
                <ListingPreview
                    listing={listing}
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                />
            )}

            {showAddAmenities && listing && (
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
            )}

            {showGuestSafety && listing && (
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
            )}
        </div>
    );
};

export default ListingEditor;
