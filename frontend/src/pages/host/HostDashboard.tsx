import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Grid3x3, Menu, Mail, Home, Globe, HelpCircle, Settings, BookOpen, Users, UserPlus, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { useHost } from '@/contexts/HostContext';
import HostHeader from '@/components/HostHeader';

interface Listing {
    listing: {
        id: string;
        title: string;
        property_type: string;
        city: string;
        country: string;
        status: string;
        updated_at: string;
    };
    photos: { url: string }[];
}

const getInitials = (name: string) => {
    const n = name?.trim();
    if (!n) return 'AD';
    const parts = n.split(/\s+/);
    if (parts.length === 1) return n.slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
};

const HostDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const { resetDraft } = useHost();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedListing, setSelectedListing] = useState<string>('');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const username = user?.username || '';
    const initials = getInitials(username || 'User');

    useEffect(() => {
        const fetchListings = async () => {
            try {
                const response = await apiClient.get('/listings/my-listings');
                setListings(response.data);
                if (response.data.length > 0) {
                    setSelectedListing(response.data[0].listing.id);
                }
            } catch (error) {
                console.error('Failed to fetch listings:', error);
            } finally {
                setLoading(false);
            }
        };

        // Wait for auth to resolve to avoid calling without a session
        if (!user) {
            // If not logged in, show empty state quickly
            if (loading === false) setLoading(false);
            return;
        }

        fetchListings();
        // Re-run when user changes (e.g., after login)
    }, [user, loading]);

    const handleCreateListing = () => {
        if (user) {
            resetDraft();
            navigate('/host/intro');
        } else {
            navigate('/webauth-login?redirect=/host/intro');
        }
    };

    // Calendar view removed

    const handleLogout = async () => {
        await logout();
        setIsUserMenuOpen(false);
        navigate('/');
    };

    // Check if any listing needs action
    const hasActionRequired = listings.some(item => item.listing.status === 'draft' || item.listing.status === 'pending');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Host Navbar */}
            <HostHeader />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-12">
                {/* Alert Banner */}
                {hasActionRequired && (
                    <div className="mb-8 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Mail className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">{t('host.dashboard.confirmDetailsTitle', 'Confirm a few key details')}</h3>
                                <p className="text-sm text-gray-600">{t('host.dashboard.confirmDetailsDesc', 'Required to publish.')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-gray-900">{t('host.dashboard.yourListing', 'Your listing')}</h1>
                    <div className="flex items-center gap-3">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Grid3x3 className="h-5 w-5 text-gray-700" />
                        </button>
                        <button
                            onClick={handleCreateListing}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Plus className="h-5 w-5 text-gray-700" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16 text-gray-500">{t('host.dashboard.loading', 'Loading listings...')}</div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <Home className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900">{t('host.dashboard.noListings', 'No listings yet')}</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">{t('host.dashboard.noListingsHelp', 'Create your first listing to start hosting and earning income.')}</p>
                        <Button
                            onClick={handleCreateListing}
                            className="bg-[#FF385C] hover:bg-[#E31C5F] text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            {t('host.dashboard.createListing', 'Create Listing')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Mobile cards */}
                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {listings.map((item) => (
                                <div
                                    key={item.listing.id}
                                    className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                                    onClick={() => {
                                        setSelectedListing(item.listing.id);
                                        navigate(`/host/editor/${item.listing.id}`);
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-24 w-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 shadow-inner">
                                            {item.photos?.[0]?.url ? (
                                                <img
                                                    src={getImageUrl(item.photos[0].url)}
                                                    alt={item.listing.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                                    <Home className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 py-1">
                                            <div className="flex flex-col gap-1">
                                                <div className="font-semibold text-gray-900 truncate text-lg">
                                                    {item.listing.title || t('host.dashboard.untitled', 'Untitled Listing')}
                                                </div>
                                                <div className="text-sm text-gray-500 truncate">
                                                    {(item.listing.property_type || t('home', 'Home'))}
                                                    {item.listing.city ? ` · ${item.listing.city}` : ''}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`h-2 w-2 rounded-full ${item.listing.status === 'published'
                                                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                                                        : item.listing.status === 'draft'
                                                            ? 'bg-gray-300'
                                                            : 'bg-yellow-500'
                                                        }`} />
                                                    <span className="text-xs font-medium text-gray-600">
                                                        {item.listing.status === 'draft' ? t('host.dashboard.status.draft', 'Draft') :
                                                            item.listing.status === 'published' ? t('host.dashboard.status.published', 'Published') :
                                                                t('host.dashboard.status.pending', 'Pending')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-gray-300">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px]">
                                    <thead className="bg-gray-50">
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                {t('host.dashboard.table.listing', 'Listing')}
                                            </th>
                                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                {t('host.dashboard.table.type', 'Type')}
                                            </th>
                                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                {t('host.dashboard.table.location', 'Location')}
                                            </th>
                                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                {t('host.dashboard.table.status', 'Status')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {listings.map((item) => (
                                            <tr
                                                key={item.listing.id}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => {
                                                    setSelectedListing(item.listing.id);
                                                    navigate(`/host/editor/${item.listing.id}`);
                                                }}
                                            >
                                                <td className="py-5 px-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-16 w-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                                            {item.photos?.[0]?.url ? (
                                                                <img
                                                                    src={getImageUrl(item.photos[0].url)}
                                                                    alt={item.listing.title}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                                                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-medium text-gray-900 truncate">
                                                                {item.listing.title || t('host.dashboard.untitled', 'Untitled Listing')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-sm text-gray-700">
                                                    {item.listing.property_type || t('home', 'Home')}
                                                </td>
                                                <td className="py-5 px-6 text-sm text-gray-700">
                                                    {item.listing.city && item.listing.country
                                                        ? `${item.listing.city}, ${item.listing.country}`
                                                        : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="py-5 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`h-2 w-2 rounded-full ${item.listing.status === 'published'
                                                            ? 'bg-green-500'
                                                            : item.listing.status === 'draft'
                                                                ? 'bg-red-500'
                                                                : 'bg-yellow-500'
                                                            }`} />
                                                        <span className="text-sm text-gray-700">
                                                            {item.listing.status === 'draft' ? t('host.dashboard.status.actionRequired', 'Action required') :
                                                                item.listing.status === 'published' ? t('host.dashboard.status.published', 'Published') :
                                                                    t('host.dashboard.status.pending', 'Pending')}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe transition-all duration-300">
                <div className="max-w-md mx-auto px-6">
                    <ul className="grid grid-cols-4 h-16">
                        <li className="flex items-center justify-center">
                            <a href="/host/listening" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform group-hover:bg-gray-100">
                                    <Home className="h-6 w-6 text-gray-500 group-hover:text-gray-900 transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">{t('nav.listening', 'Listening')}</span>
                            </a>
                        </li>
                        
                        <li className="flex items-center justify-center">
                            <a href="/host/dashboard" className="flex flex-col items-center gap-1 group w-full h-full justify-center">
                                <div className="p-1.5 rounded-full group-active:scale-95 transition-transform">
                                    <Grid3x3 className="h-6 w-6 text-primary fill-current" />
                                </div>
                                <span className="text-[10px] font-medium text-primary">{t('nav.listings', 'Listings')}</span>
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

export default HostDashboard;
