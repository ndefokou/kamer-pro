import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { Menu, Mail, Calendar, Grid3x3, Home, Globe, HelpCircle, Settings, BookOpen, Users, UserPlus, LogOut, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/lib/utils';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Booking {
    id: string;
    listing_id: string;
    guest_id: number;
    check_in: string;
    check_out: string;
    guests: number;
    total_price: number;
    status: string;
    created_at?: string;
    updated_at?: string;
}

interface BookingWithDetails {
    booking: Booking;
    guest_name: string;
    guest_email: string;
    listing_title: string;
    listing_photo?: string;
    listing_city?: string;
    listing_country?: string;
}

type TabType = 'today' | 'upcoming';

const HostToday: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('today');
    const [todayBookings, setTodayBookings] = useState<BookingWithDetails[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<BookingWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const username = localStorage.getItem('username') || '';
    const getInitials = (name: string) => {
        const n = name?.trim();
        if (!n) return 'AD';
        const parts = n.split(/\s+/);
        if (parts.length === 1) return n.slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };
    const initials = getInitials(username || 'User');

    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            try {
                if (activeTab === 'today') {
                    const response = await apiClient.get('/bookings/host/today');
                    setTodayBookings(response.data);
                } else {
                    const response = await apiClient.get('/bookings/host/upcoming');
                    setUpcomingBookings(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch bookings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [activeTab]);

    const currentBookings = activeTab === 'today' ? todayBookings : upcomingBookings;
    const hasActionRequired = todayBookings.length > 0 || upcomingBookings.length > 0;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Host Navbar */}
            <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 pt-safe">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="text-[#FF385C] font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
                            MboaMaison
                        </div>
                        <nav className="hidden md:flex gap-8 text-sm font-medium">
                            <a href="/host/today" className="text-gray-900 font-semibold relative pb-6">
                                Today
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>
                            </a>
                            <a href="/host/calendar" className="text-gray-600 hover:text-gray-900 transition-colors">Calendar</a>
                            <a href="/host/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">Listings</a>
                            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Messages</a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            className="text-sm font-medium hover:bg-gray-100 rounded-full px-4"
                            onClick={() => navigate('/')}
                        >
                            Switch to traveling
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
                                    <SheetTitle>Menu</SheetTitle>
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
                                        <span>Account settings</span>
                                    </button>
                                    <button
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
                                        onClick={() => { setIsUserMenuOpen(false); navigate('/account?tab=languages'); }}
                                    >
                                        <Globe className="h-5 w-5" />
                                        <span>Languages & currency</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100">
                                        <BookOpen className="h-5 w-5" />
                                        <span>Hosting resources</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100">
                                        <HelpCircle className="h-5 w-5" />
                                        <span>Get help</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100">
                                        <Users className="h-5 w-5" />
                                        <span>Find a co-host</span>
                                    </button>
                                    <button
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            navigate('/host/intro');
                                        }}
                                    >
                                        <Plus className="h-5 w-5" />
                                        <span>Create a new listing</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100">
                                        <UserPlus className="h-5 w-5" />
                                        <span>Refer a host</span>
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
                                            <span>Log out</span>
                                        </button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-12">
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome back, {username || 'Host'}</h1>
                    <p className="text-gray-600 mt-1">Here's what's happening today.</p>
                </div>

                {/* Alert Banner */}
                {hasActionRequired && (
                    <div className="mb-8 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <Mail className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">Action required</h3>
                            <p className="text-sm text-gray-600 mt-1">You have pending items to review to publish your listing.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate('/host/dashboard')}>
                            Review
                        </Button>
                    </div>
                )}

                {/* Tab Switcher */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex bg-white rounded-full p-1 shadow-sm border border-gray-200">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'today'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'upcoming'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Upcoming
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-16 text-gray-500">Loading reservations...</div>
                ) : currentBookings.length === 0 ? (
                    /* Empty State */
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            No {activeTab === 'upcoming' ? 'upcoming ' : ''}reservations
                        </h2>
                        <p className="text-gray-500 mb-6 text-center max-w-sm">
                            {activeTab === 'today'
                                ? "You don't have any guests checking in or out today."
                                : "You don't have any upcoming bookings at the moment."}
                        </p>
                        <Button
                            onClick={() => navigate('/host/dashboard')}
                            className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6"
                        >
                            Manage Listings
                        </Button>
                    </div>
                ) : (
                    /* Reservations List */
                    <div className="space-y-4">
                        {currentBookings.map((item) => (
                            <div
                                key={item.booking.id}
                                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex gap-6">
                                    {/* Listing Photo */}
                                    <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                                        {item.listing_photo ? (
                                            <img
                                                src={getImageUrl(item.listing_photo)}
                                                alt={item.listing_title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Booking Details */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                                    {item.listing_title}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {item.listing_city && item.listing_country
                                                        ? `${item.listing_city}, ${item.listing_country}`
                                                        : 'Location not specified'}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.booking.status === 'confirmed'
                                                ? 'bg-green-100 text-green-700'
                                                : item.booking.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {item.booking.status.charAt(0).toUpperCase() + item.booking.status.slice(1)}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 mb-1">Guest</p>
                                                <p className="font-medium text-gray-900">{item.guest_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 mb-1">Check-in</p>
                                                <p className="font-medium text-gray-900">{formatDate(item.booking.check_in)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 mb-1">Check-out</p>
                                                <p className="font-medium text-gray-900">{formatDate(item.booking.check_out)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 mb-1">Guests</p>
                                                <p className="font-medium text-gray-900">{item.booking.guests}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe transition-all duration-300">
                <div className="max-w-md mx-auto px-6">
                    <ul className="grid grid-cols-4 h-16">
                        <li className="flex items-center justify-center">
                            <a href="/host/today" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform">
                                    <Home className="h-6 w-6 text-primary fill-current" />
                                </div>
                                <span className="text-[10px] font-medium text-primary">Today</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <a href="/host/calendar" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Calendar className="h-6 w-6 text-gray-500 group-hover:text-gray-900 transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Calendar</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <a href="/host/dashboard" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Grid3x3 className="h-6 w-6 text-gray-500 group-hover:text-gray-900 transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Listings</span>
                            </a>
                        </li>
                        <li className="flex items-center justify-center">
                            <a href="/messages?view=host" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Mail className="h-6 w-6 text-gray-500 group-hover:text-gray-900 transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Messages</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
    );
};

export default HostToday;
