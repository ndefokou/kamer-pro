import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { approveBooking, declineBooking } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Menu, Mail, Calendar, Grid3x3, Home, Globe, HelpCircle, Settings, BookOpen, Users, UserPlus, LogOut, Plus, CheckCircle, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { openWhatsApp } from '@/lib/whatsapp';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/lib/utils';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import HostHeader from '@/components/HostHeader';
import { getUserById } from '@/services/accountService';
import { useTranslation } from 'react-i18next';

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

const Reservations: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('today');
    const [todayBookings, setTodayBookings] = useState<BookingWithDetails[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<BookingWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Decline dialog state
    const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const username = localStorage.getItem('username') || '';
    const getInitials = (name: string) => {
        const n = name?.trim();
        if (!n) return 'AD';
        const parts = n.split(/\s+/);
        if (parts.length === 1) return n.slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const handleMessageGuest = async (guestId: number) => {
        try {
            const res = await getUserById(guestId);
            const success = openWhatsApp(res.profile?.phone || null, t('host.reservations.whatsappGreeting', { name: res.user.username }));
            if (!success) {
                toast({
                    title: t('common.error'),
                    description: "Guest's phone number is missing.",
                    variant: "destructive"
                });
            }
        } catch (e) {
            console.error('Failed to fetch guest phone', e);
        }
    };
    const initials = getInitials(username || 'User');

    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            try {
                const [todayRes, upcomingRes] = await Promise.all([
                    apiClient.get('/bookings/host/today'),
                    apiClient.get('/bookings/host/upcoming')
                ]);
                setTodayBookings(todayRes.data);
                setUpcomingBookings(upcomingRes.data);
            } catch (error) {
                console.error('Failed to fetch bookings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    const handleApprove = async (bookingId: string) => {
        try {
            await approveBooking(bookingId);
            // Refresh bookings
            const [todayRes, upcomingRes] = await Promise.all([
                apiClient.get('/bookings/host/today'),
                apiClient.get('/bookings/host/upcoming')
            ]);
            setTodayBookings(todayRes.data);
            setUpcomingBookings(upcomingRes.data);
        } catch (error) {
            console.error('Failed to approve booking:', error);
        }
    };

    const openDeclineDialog = (bookingId: string) => {
        setSelectedBookingId(bookingId);
        setDeclineReason('');
        setDeclineDialogOpen(true);
    };

    const handleDeclineSubmit = async () => {
        if (!selectedBookingId || !declineReason.trim()) return;

        setIsSubmitting(true);
        try {
            await declineBooking(selectedBookingId, declineReason);
            // Also notify guest via WhatsApp if we can fetch their phone
            const all = [...todayBookings, ...upcomingBookings];
            const b = all.find(x => x.booking.id === selectedBookingId);
            if (b) {
                try {
                    const res = await getUserById(b.booking.guest_id);
                    openWhatsApp(res.profile?.phone || null, t('host.reservations.declineWhatsapp', { reason: declineReason }));
                } catch (e) {
                    console.error('Failed to send WhatsApp notification', e);
                }
            }
            setDeclineDialogOpen(false);
            // Refresh bookings
            const [todayRes, upcomingRes] = await Promise.all([
                apiClient.get('/bookings/host/today'),
                apiClient.get('/bookings/host/upcoming')
            ]);
            setTodayBookings(todayRes.data);
            setUpcomingBookings(upcomingRes.data);
        } catch (error) {
            console.error('Failed to decline booking:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentBookings = activeTab === 'today' ? todayBookings : upcomingBookings;
    const hasActionRequired = todayBookings.some(b => b.booking.status === 'pending');

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">{t('common.loading', 'Loading...')}</div>;
    }

    const getStatusLabel = (s: string) => {
        const defaults: Record<string, string> = { confirmed: 'Confirmed', pending: 'Pending', declined: 'Declined' };
        return t(`status.${s}`, defaults[s] || s);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <HostHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold text-gray-900">{t('host.reservations.title', 'Reservations')}</h1>
                </div>

                {/* Segmented control */}
                <div className="mb-6 flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`${activeTab === 'today' ? 'bg-gray-900 text-white shadow' : 'bg-white text-gray-700 border'} px-4 py-1.5 rounded-full text-sm font-medium`}
                    >
                        {t('common.today', 'Today')}
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`${activeTab === 'upcoming' ? 'bg-gray-900 text-white shadow' : 'bg-white text-gray-700 border'} px-4 py-1.5 rounded-full text-sm font-medium`}
                    >
                        {t('common.upcoming', 'Upcoming')}
                    </button>
                </div>

                {activeTab === 'today' ? (
                    <section className="mb-12">
                        {todayBookings.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-2xl mx-auto my-16">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <Calendar className="h-10 w-10 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">{t('host.reservations.emptyTodayTitle', 'No reservations today')}</h3>
                                <p className="text-gray-500 mt-2">{t("host.reservations.emptyTodayDesc", "You don't have any guests checking in or out today.")}</p>
                                <Button className="mt-6 rounded-full px-5">{t('host.common.manageListings', 'Manage Listings')}</Button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {todayBookings.map((booking) => (
                                    <div key={booking.booking.id} className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                    <span className="font-semibold text-gray-600">
                                                        {booking.guest_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{booking.guest_name}</h3>
                                                    <p className="text-sm text-gray-500">{booking.listing_title}</p>
                                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                        <span>{booking.booking.guests} {t('common.guests', 'guests')}</span>
                                                        <span>•</span>
                                                        <span>{new Date(booking.booking.check_in).toLocaleDateString()} - {new Date(booking.booking.check_out).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="mt-2">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                            ${booking.booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                                booking.booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    booking.booking.status === 'declined' ? 'bg-red-100 text-red-800' :
                                                                        'bg-gray-100 text-gray-800'}`}>
                                                            {getStatusLabel(booking.booking.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Button variant="outline" className="rounded-full px-4 flex items-center gap-2" onClick={() => handleMessageGuest(booking.booking.guest_id)}>
                                                    <MessageSquare className="h-4 w-4" />
                                                    {t('common.message', 'Message')}
                                                </Button>
                                                {booking.booking.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            onClick={() => handleApprove(booking.booking.id)}
                                                            className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4"
                                                        >
                                                            {t('common.approve', 'Approve')}
                                                        </Button>
                                                        <Button
                                                            onClick={() => openDeclineDialog(booking.booking.id)}
                                                            variant="outline"
                                                            className="text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-full px-4"
                                                        >
                                                            {t('common.decline', 'Decline')}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                ) : (
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('common.upcoming', 'Upcoming')}</h2>
                        {upcomingBookings.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-2xl mx-auto my-16">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <Calendar className="h-10 w-10 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">{t('host.reservations.emptyUpcomingTitle', 'No upcoming reservations')}</h3>
                                <p className="text-gray-500 mt-2">{t('host.reservations.emptyUpcomingDesc', 'Finish and publish your listing to receive bookings.')}</p>
                                <Button className="mt-6 rounded-full px-5">{t('host.common.manageListings', 'Manage Listings')}</Button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {upcomingBookings.map((booking) => (
                                    <div key={booking.booking.id} className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                    <span className="font-semibold text-gray-600">
                                                        {booking.guest_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{booking.guest_name}</h3>
                                                    <p className="text-sm text-gray-500">{booking.listing_title}</p>
                                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                        <span>{booking.booking.guests} {t('common.guests', 'guests')}</span>
                                                        <span>•</span>
                                                        <span>{new Date(booking.booking.check_in).toLocaleDateString()} - {new Date(booking.booking.check_out).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="outline" className="rounded-full px-4 w-full md:w-auto" onClick={() => handleMessageGuest(booking.booking.guest_id)}>{t('common.message', 'Message')}</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Decline Dialog */}
            {declineDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('host.reservations.declineTitle', 'Decline Booking')}</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('host.reservations.declineHelp', 'Please provide a reason for declining this booking. This message will be sent to the guest.')}
                        </p>
                        <textarea
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder={t('host.reservations.declinePlaceholder', 'e.g., The dates are no longer available...') as string}
                            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeclineDialogOpen(false)}
                                disabled={isSubmitting}
                            >
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button
                                onClick={handleDeclineSubmit}
                                disabled={!declineReason.trim() || isSubmitting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isSubmitting ? t('host.reservations.declining', 'Declining...') : t('host.reservations.declineCta', 'Decline Booking')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe transition-all duration-300">
                <div className="max-w-md mx-auto px-6">
                    <ul className="grid grid-cols-3 h-16">
                        <li className="flex items-center justify-center">
                            <a href="/host/reservations" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform">
                                    <Home className="h-6 w-6 text-primary fill-current" />
                                </div>
                                <span className="text-[10px] font-medium text-primary">{t('nav.reservations', 'Reservations')}</span>
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
                            <a href="/messages?view=host" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
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

export default Reservations;
