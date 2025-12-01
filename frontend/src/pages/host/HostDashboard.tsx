import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Grid3x3, Menu, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/lib/utils';

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

const HostDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedListing, setSelectedListing] = useState<string>('');

    useEffect(() => {
        const fetchListings = async () => {
            try {
                const response = await apiClient.get('/listings/my-listings');
                setListings(response.data);
                // Set first listing as default selected
                if (response.data.length > 0) {
                    setSelectedListing(response.data[0].listing.id);
                }
            } catch (error) {
                console.error('Failed to fetch listings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, []);

    const handleCreateListing = () => {
        navigate('/host/intro');
    };

    const handleCalendarClick = () => {
        if (selectedListing) {
            navigate(`/host/calendar?listing=${selectedListing}`);
        } else if (listings.length > 0) {
            navigate(`/host/calendar?listing=${listings[0].listing.id}`);
        }
    };

    // Check if any listing needs action
    const hasActionRequired = listings.some(item => item.listing.status === 'draft' || item.listing.status === 'pending');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Host Navbar */}
            <header className="border-b bg-white sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="text-[#FF385C] font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
                            MboaMaison
                        </div>
                        <nav className="hidden lg:flex gap-8 text-sm font-medium">
                            <a href="/host/today" className="text-gray-600 hover:text-gray-900 transition-colors">Today</a>
                            <button
                                onClick={handleCalendarClick}
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Calendar
                            </button>
                            <a href="/host/dashboard" className="text-gray-900 font-semibold relative pb-6">
                                Listings
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>
                            </a>
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
                        <div className="flex items-center gap-3 border border-gray-300 rounded-full py-1.5 px-3 hover:shadow-md transition-shadow cursor-pointer">
                            <Menu className="h-4 w-4 text-gray-700" />
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="/placeholder-user.jpg" />
                                <AvatarFallback className="bg-gray-700 text-white text-xs">AD</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                {/* Alert Banner */}
                {hasActionRequired && (
                    <div className="mb-8 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                                <Mail className="h-6 w-6 text-pink-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">Confirm a few key details</h3>
                                <p className="text-sm text-gray-600">Required to publish.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-gray-900">Your listing</h1>
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
                    <div className="text-center py-16 text-gray-500">Loading listings...</div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">No listings yet</h3>
                        <p className="text-gray-600 mb-6">Create your first listing to start hosting</p>
                        <Button
                            onClick={handleCreateListing}
                            className="bg-[#FF385C] hover:bg-[#E31C5F] text-white rounded-lg px-6"
                        >
                            Create Listing
                        </Button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Listing
                                    </th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Status
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
                                            navigate(`/host/preview`);
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
                                                        {item.listing.title || 'Untitled Listing'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-sm text-gray-700">
                                            {item.listing.property_type || 'Home'}
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
                                                    {item.listing.status === 'draft' ? 'Action required' :
                                                        item.listing.status === 'published' ? 'Published' :
                                                            'Pending'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default HostDashboard;
