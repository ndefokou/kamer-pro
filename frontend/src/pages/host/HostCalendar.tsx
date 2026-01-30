import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { Menu, ChevronDown, X, Check, Calendar as CalendarIcon, Grid3x3, Mail, Home, Globe, HelpCircle, Settings, BookOpen, Users, UserPlus, LogOut, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';
import CalendarGrid from '@/components/host/CalendarGrid';
import PriceSettingsModal from '@/components/host/PriceSettingsModal';
import AvailabilitySettingsModal from '../../components/host/AvailabilitySettingsModal';

interface CalendarPricing {
    id: number;
    listing_id: string;
    date: string;
    price: number;
    is_available: number;
}

interface MyListing {
    listing: {
        id: string;
        title?: string;
        city?: string;
        country?: string;
        status?: string;
    };
    photos?: { url: string }[];
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

const HostCalendar: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const listingId = searchParams.get('listing') || '';

    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [pricingData, setPricingData] = useState<Map<string, CalendarPricing>>(new Map());
    const [settings, setSettings] = useState<ListingSettings | null>(null);
    const [sidebarView, setSidebarView] = useState<'default' | 'price' | 'availability'>('default');
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [listingPrice, setListingPrice] = useState<number>(0);
    const [editingPrice, setEditingPrice] = useState<number>(0);
    const [showCustomSettings, setShowCustomSettings] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [myListings, setMyListings] = useState<MyListing[]>([]);
    const [listingsLoading, setListingsLoading] = useState<boolean>(false);
    const username = localStorage.getItem('username') || '';
    const getInitials = (name: string) => {
        const n = name?.trim();
        if (!n) return 'AD';
        const parts = n.split(/\s+/);
        if (parts.length === 1) return n.slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };
    const initials = getInitials(username || 'User');
    const [customMinNights, setCustomMinNights] = useState<number>(1);

    const fetchListingPrice = useCallback(async () => {
        try {
            const response = await apiClient.get(`/listings/${listingId}`);
            const price = response.data.listing?.price_per_night || 0;
            setListingPrice(price);
        } catch (error) {
            console.error('Failed to fetch listing price:', error);
        }
    }, [listingId]);

    const fetchCalendarData = useCallback(async () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 12);

        try {
            const response = await apiClient.get(`/calendar/${listingId}`, {
                params: {
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                },
            });

            const dataMap = new Map<string, CalendarPricing>();
            response.data.forEach((item: CalendarPricing) => {
                dataMap.set(item.date, item);
            });
            setPricingData(dataMap);
        } catch (error) {
            console.error('Failed to fetch calendar data:', error);
        } finally {
            setLoading(false);
        }
    }, [listingId]);

    const fetchSettings = useCallback(async () => {
        try {
            const response = await apiClient.get(`/calendar/${listingId}/settings`);
            setSettings(response.data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    }, [listingId]);

    useEffect(() => {
        const initCalendar = async () => {
            if (!listingId) {
                setListingsLoading(true);
                try {
                    const response = await apiClient.get('/listings/my-listings');
                    const rows = Array.isArray(response.data) ? response.data : [];
                    setMyListings(rows);
                    if (rows.length === 0) {
                        navigate('/host/dashboard');
                    }
                } catch (error) {
                    console.error('Failed to fetch listings:', error);
                    navigate('/host/dashboard');
                } finally {
                    setListingsLoading(false);
                }
                return;
            }
            fetchListingPrice();
            fetchCalendarData();
            fetchSettings();
        };

        initCalendar();
    }, [listingId, navigate, fetchListingPrice, fetchCalendarData, fetchSettings]);

    const handleDateSelect = (date: string) => {
        setSelectedDates(prev => {
            if (prev.includes(date)) {
                return prev.filter(d => d !== date);
            } else {
                return [...prev, date];
            }
        });
        // Set editing price to current price for this date
        const currentPrice = pricingData.get(date)?.price || settings?.base_price || listingPrice;
        setEditingPrice(currentPrice);
        setShowCustomSettings(false);
    };

    const handleAvailabilityToggle = async () => {
        if (selectedDates.length === 0) return;

        const currentAvailability = selectedDates.every(date => {
            const data = pricingData.get(date);
            return (data?.is_available ?? 1) === 1;
        });

        try {
            await apiClient.put(`/calendar/${listingId}/dates`, {
                dates: selectedDates,
                is_available: !currentAvailability,
            });
            await fetchCalendarData();
        } catch (error) {
            console.error('Failed to update availability:', error);
        }
    };

    const handlePriceUpdate = async (price: number) => {
        if (selectedDates.length === 0) return;

        try {
            await apiClient.put(`/calendar/${listingId}/dates`, {
                dates: selectedDates,
                price,
            });
            await fetchCalendarData();
            setEditingPrice(price);
        } catch (error) {
            console.error('Failed to update price:', error);
        }
    };

    const handleSaveCustomSettings = async () => {
        if (selectedDates.length === 0) return;

        try {
            // Update price and custom min nights for selected dates
            await apiClient.put(`/calendar/${listingId}/dates`, {
                dates: selectedDates,
                price: editingPrice,
            });
            await fetchCalendarData();
            setShowCustomSettings(false);
        } catch (error) {
            console.error('Failed to save custom settings:', error);
        }
    };

    const getMonthsToDisplay = () => {
        const months = [];
        const startYear = currentYear;
        // Show 24 months (2 years) starting from January of selected year
        for (let year = startYear; year < startYear + 2; year++) {
            for (let month = 0; month < 12; month++) {
                months.push(new Date(year, month, 1));
            }
        }
        return months;
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getAvailableYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = 0; i < 5; i++) {
            years.push(currentYear + i);
        }
        return years;
    };

    const handleMonthChange = (monthIndex: number) => {
        const newDate = new Date(currentYear, monthIndex, 1);
        setCurrentMonth(newDate);
        // Scroll to the selected month
        const monthId = `month-${currentYear}-${monthIndex}`;
        const monthElement = document.getElementById(monthId);
        if (monthElement) {
            monthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleYearChange = (year: number) => {
        setCurrentYear(year);
        const newDate = new Date(year, 0, 1);
        setCurrentMonth(newDate);
        // Scroll to January of the selected year
        setTimeout(() => {
            const monthElement = document.getElementById(`month-${year}-0`);
            if (monthElement) {
                monthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    const selectedPrice = selectedDates.length > 0 && selectedDates.length === 1
        ? pricingData.get(selectedDates[0])?.price || settings?.base_price || listingPrice
        : settings?.base_price || listingPrice;

    const isAvailable = selectedDates.length > 0
        ? selectedDates.every(date => (pricingData.get(date)?.is_available ?? 1) === 1)
        : true;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 pt-safe">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="text-green-600 font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
                            Le Mboko
                        </div>
                        <nav className="hidden md:flex gap-8 text-sm font-medium">
                            <a href="/host/reservations" className="text-gray-600 hover:text-gray-900 transition-colors">{t('nav.reservations', 'reservations')}</a>
                            <a href="/host/calendar" className="text-gray-900 font-semibold relative pb-6">
                                {t('nav.calendar', 'Calendar')}
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>
                            </a>
                            <a href="/host/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">{t('nav.listings', 'Listings')}</a>
                            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">{t('nav.messages', 'Messages')}</a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            className="text-sm font-medium hover:bg-gray-100 rounded-full px-4"
                            onClick={() => navigate('/')}
                        >
                            {t('host.header.switchToTraveling', 'Switch to traveling')}
                        </Button>
                        <Sheet open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
                            <SheetTrigger asChild>
                                <div className="flex items-center gap-3 border border-gray-300 rounded-full py-1.5 px-3 hover:shadow-md transition-shadow cursor-pointer">
                                    <Menu className="h-4 w-4 text-gray-700" />
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="/placeholder-user.jpg" />
                                        <AvatarFallback className="bg-gray-700 text-white text-xs">{initials}</AvatarFallback>
                                    </Avatar>
                                </div>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[360px] sm:w-[420px]">
                                <SheetHeader>
                                    <SheetTitle>{t('common.menu', 'Menu')}</SheetTitle>
                                    <SheetDescription></SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-1">
                                    <div className="flex items-center gap-3 pb-4 border-b">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src="/placeholder-user.jpg" />
                                            <AvatarFallback className="bg-gray-700 text-white text-sm">{initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-semibold text-gray-900">{username || 'User'}</div>
                                    </div>

                                    <button
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
                                        onClick={() => { setIsUserMenuOpen(false); navigate('/account'); }}
                                    >
                                        <Settings className="h-5 w-5" />
                                        <span>{t('account.settings', 'Account settings')}</span>
                                    </button>
                                    <button
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            navigate('/host/intro');
                                        }}
                                    >
                                        <Plus className="h-5 w-5" />
                                        <span>{t('host.header.createListing', 'Create a new listing')}</span>
                                    </button>
                                    <div className="pt-3 mt-2 border-t">
                                        <button
                                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-red-600"
                                            onClick={() => {
                                                localStorage.removeItem('token');
                                                localStorage.removeItem('username');
                                                localStorage.removeItem('userId');
                                                localStorage.removeItem('email');
                                                setIsUserMenuOpen(false);
                                                navigate('/');
                                            }}
                                        >
                                            <LogOut className="h-5 w-5" />
                                            <span>{t('auth.logout', 'Log out')}</span>
                                        </button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-24 md:pb-12">
                {!listingId ? (
                    <div className="py-10">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold">{t('host.calendar.pickListing', 'Choose a listing')}</h2>
                            <p className="text-gray-600">{t('host.calendar.pickListingHelp', 'Select a listing to manage its availability')}</p>
                        </div>
                        {listingsLoading ? (
                            <div className="text-gray-500">{t('common.loading', 'Loading...')}</div>
                        ) : myListings.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myListings.map((item) => (
                                    <button
                                        key={item.listing.id}
                                        onClick={() => navigate(`/host/calendar?listing=${item.listing.id}`)}
                                        className="text-left bg-white rounded-xl border border-gray-200 hover:shadow-md transition overflow-hidden"
                                    >
                                        <div className="h-40 bg-gray-100">
                                            {item.photos?.[0]?.url ? (
                                                <OptimizedImage src={getImageUrl(item.photos[0].url)} alt={item.listing.title || 'Listing'} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <Home className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <div className="font-medium text-gray-900 truncate">{item.listing.title || t('host.dashboard.untitled', 'Untitled Listing')}</div>
                                            <div className="text-sm text-gray-500 truncate">{[item.listing.city, item.listing.country].filter(Boolean).join(', ')}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500">{t('host.calendar.noListings', 'No listings yet')}</div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Calendar Section */}
                        <div className="flex-1">
                            {/* Month & Year Selector */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="relative group">
                                        <select
                                            value={currentMonth.getFullYear()}
                                            onChange={(e) => handleYearChange(Number(e.target.value))}
                                            className="text-3xl font-bold bg-transparent border-none cursor-pointer pr-8 focus:outline-none appearance-none hover:text-gray-600 transition-colors"
                                        >
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="h-6 w-6 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-gray-600 transition-colors" />
                                    </div>
                                    <div className="relative group">
                                        <select
                                            value={currentMonth.getMonth()}
                                            onChange={(e) => handleMonthChange(Number(e.target.value))}
                                            className="text-3xl font-bold bg-transparent border-none cursor-pointer pr-8 focus:outline-none appearance-none hover:text-gray-600 transition-colors"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i).map(monthIndex => (
                                                <option key={monthIndex} value={monthIndex}>
                                                    {new Date(0, monthIndex).toLocaleString('default', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="h-6 w-6 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-gray-600 transition-colors" />
                                    </div>
                                </div>
                                <div>
                                    <Button
                                        variant="outline"
                                        className="rounded-full border-gray-300"
                                        onClick={() => navigate('/host/calendar')}
                                    >
                                        {t('host.calendar.changeListing', 'Change listing')}
                                    </Button>
                                </div>
                            </div>

                            {/* Calendar Grids */
                            }
                            {loading ? (
                                <div className="text-center py-12 text-gray-500">{t('host.calendar.loading', 'Loading calendar...')}</div>
                            ) : (
                                <div className="space-y-12">
                                    {getMonthsToDisplay().map((month, index) => {
                                        const monthId = `month-${month.getFullYear()}-${month.getMonth()}`;
                                        return (
                                            <div key={monthId} id={monthId}>
                                                <CalendarGrid
                                                    month={month}
                                                    pricingData={pricingData}
                                                    selectedDates={selectedDates}
                                                    onDateSelect={handleDateSelect}
                                                    basePrice={settings?.base_price || listingPrice}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {/* Sidebar Panel */}
                        <div className="lg:w-80 w-full">
                            <div className="lg:sticky lg:top-24 space-y-4 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto no-scrollbar">
                                {selectedDates.length > 0 ? (
                                    <>
                                        {/* Selected Date Panel */}
                                        {!showCustomSettings ? (
                                            <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">
                                                            {selectedDates.length === 1
                                                                ? new Date(selectedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                                : `${selectedDates.length} dates`
                                                            }
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedDates([])}
                                                        className="p-1 hover:bg-gray-800 rounded-full"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between py-2">
                                                    <span className="text-sm font-medium">{t('host.calendar.available', 'Available')}</span>
                                                    <button
                                                        onClick={handleAvailabilityToggle}
                                                        className={`w-12 h-6 rounded-full transition-colors ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}
                                                        aria-pressed={isAvailable}
                                                        aria-label={isAvailable ? t('host.calendar.available', 'Available') : t('host.calendar.unavailable', 'Unavailable')}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                                    </button>
                                                </div>

                                                <div>
                                                    <p className="text-xs text-gray-400 mb-2">{t('host.calendar.price', 'Price')}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl font-semibold">$</span>
                                                        <input
                                                            type="number"
                                                            value={editingPrice}
                                                            onChange={(e) => setEditingPrice(Number(e.target.value))}
                                                            onBlur={() => handlePriceUpdate(editingPrice)}
                                                            className="text-2xl font-semibold bg-transparent border-none text-white w-24 focus:outline-none focus:ring-0"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setShowCustomSettings(true)}
                                                    className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-3 transition-colors text-left"
                                                >
                                                    <span className="text-sm font-medium">{t('host.calendar.customSettings', 'Custom settings')}</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium">
                                                        {selectedDates.length === 1
                                                            ? new Date(selectedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                            : `${selectedDates.length} dates`
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() => setShowCustomSettings(false)}
                                                        className="p-1 hover:bg-gray-800 rounded-full"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>

                                                <div className="text-sm font-medium mb-4">{t('host.calendar.customSettings', 'Custom settings')}</div>

                                                <div className="bg-gray-800 rounded-lg px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">{t('host.calendar.minNights', 'Minimum nights')}</span>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCustomMinNights(customMinNights > 1 ? customMinNights - 1 : 1);
                                                                }}
                                                                className="w-8 h-8 rounded-full border border-gray-600 hover:border-white transition-colors flex items-center justify-center"
                                                                disabled={customMinNights <= 1}
                                                            >
                                                                <span className="text-lg">−</span>
                                                            </button>
                                                            <span className="text-base font-medium w-8 text-center">{customMinNights}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCustomMinNights(customMinNights + 1);
                                                                }}
                                                                className="w-8 h-8 rounded-full border border-gray-600 hover:border-white transition-colors flex items-center justify-center"
                                                            >
                                                                <span className="text-lg">+</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleSaveCustomSettings}
                                                    className="w-full bg-white text-gray-900 hover:bg-gray-100 rounded-lg px-4 py-3 transition-colors font-medium"
                                                >
                                                    {t('common.done', 'Done')}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {sidebarView === 'price' && settings ? (
                                            <div className="bg-white rounded-xl border border-gray-200 h-full overflow-hidden">
                                                <PriceSettingsModal
                                                    settings={settings}
                                                    onClose={() => setSidebarView('default')}
                                                    onSave={async (updatedSettings) => {
                                                        await apiClient.put(`/calendar/${listingId}/settings`, updatedSettings);
                                                        await fetchSettings();
                                                        setSidebarView('default');
                                                    }}
                                                />
                                            </div>
                                        ) : sidebarView === 'availability' && settings ? (
                                            <div className="bg-white rounded-xl border border-gray-200 h-full overflow-hidden">
                                                <AvailabilitySettingsModal
                                                    settings={settings}
                                                    onClose={() => setSidebarView('default')}
                                                    onSave={async (updatedSettings) => {
                                                        await apiClient.put(`/calendar/${listingId}/settings`, updatedSettings);
                                                        await fetchSettings();
                                                        setSidebarView('default');
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            /* Default Settings Panel */
                                            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                                                <button
                                                    onClick={() => setSidebarView('price')}
                                                    className="w-full flex items-center justify-between hover:bg-gray-50 rounded-lg p-3 transition-colors"
                                                >
                                                    <div className="text-left">
                                                        <p className="font-medium text-gray-900">{t('host.calendar.priceSettings', 'Price settings')}</p>
                                                        <p className="text-sm text-gray-600">${settings?.base_price || listingPrice} {t('host.editor.perNight', 'per night')}</p>
                                                        {settings?.weekend_price && (
                                                            <p className="text-sm text-gray-600">${settings.weekend_price} {t('host.calendar.weekendPrice', 'weekend price')}</p>
                                                        )}
                                                        {settings?.weekly_discount && settings.weekly_discount > 0 && (
                                                            <p className="text-sm text-gray-600">{settings.weekly_discount}% {t('host.calendar.weeklyDiscount', 'weekly discount')}</p>
                                                        )}
                                                    </div>
                                                    <ChevronDown className="h-5 w-5 text-gray-400 -rotate-90" />
                                                </button>

                                                <button
                                                    onClick={() => setSidebarView('availability')}
                                                    className="w-full flex items-center justify-between hover:bg-gray-50 rounded-lg p-3 transition-colors"
                                                >
                                                    <div className="text-left">
                                                        <p className="font-medium text-gray-900">{t('host.calendar.availabilitySettings', 'Availability settings')}</p>
                                                        <p className="text-sm text-gray-600">{settings?.min_nights || 1} - {settings?.max_nights || 365} {t('host.calendar.nightStays', 'night stays')}</p>
                                                        <p className="text-sm text-gray-600">{t('host.calendar.sameDayNotice', 'Same-day advance notice')}</p>
                                                    </div>
                                                    <ChevronDown className="h-5 w-5 text-gray-400 -rotate-90" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile selected-dates quick controls */}
            {selectedDates.length > 0 && (
                <div className="md:hidden fixed bottom-20 inset-x-0 z-40 px-4">
                    <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                    {selectedDates.length === 1
                                        ? new Date(selectedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                        : `${selectedDates.length} dates`}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedDates([])}
                                className="p-1 hover:bg-gray-800 rounded-full"
                                aria-label={t('common.clear', 'Clear selection')}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-2 mt-1">
                            <span className="text-sm font-medium">{t('host.calendar.available', 'Available')}</span>
                            <button
                                onClick={handleAvailabilityToggle}
                                className={`w-12 h-6 rounded-full transition-colors ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}
                                aria-pressed={isAvailable}
                                aria-label={isAvailable ? t('host.calendar.available', 'Available') : t('host.calendar.unavailable', 'Unavailable')}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe transition-all duration-300">
                <div className="max-w-md mx-auto px-6">
                    <ul className="grid grid-cols-4 h-16">
                        <li className="flex items-center justify-center">
                            <a href="/host/reservations" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Home className="h-6 w-6 text-gray-500 group-hover:text-gray-900 transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">{t('nav.reservations', 'reservations')}</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <a href="/host/calendar" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform">
                                    <CalendarIcon className="h-6 w-6 text-primary fill-current" />
                                </div>
                                <span className="text-[10px] font-medium text-primary">{t('nav.calendar', 'Calendar')}</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <a href="/host/dashboard" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Grid3x3 className="h-6 w-6 text-gray-500 group-hover:text-gray-900 transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">{t('nav.listings', 'Listings')}</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <a href="#" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Mail className="h-6 w-6 text-gray-500 group-hover:text-gray-900 transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">{t('nav.messages', 'Messages')}</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
    );
};

export default HostCalendar;
