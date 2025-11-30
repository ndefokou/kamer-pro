import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Search, Bell, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Listing {
    id: string;
    title: string;
    property_type: string;
    city: string;
    country: string;
    status: string;
    photos: { url: string }[];
    updated_at: string;
}

const HostDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchListings = async () => {
            try {
                const response = await apiClient.get('/listings/my-listings');
                setListings(response.data);
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

    return (
        <div className="min-h-screen bg-background">
            {/* Host Navbar */}
            <header className="border-b bg-white">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="text-primary font-bold text-2xl cursor-pointer" onClick={() => navigate('/')}>
                            MboaMaison
                        </div>
                        <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
                            <a href="#" className="hover:text-foreground transition-colors">Today</a>
                            <a href="#" className="hover:text-foreground transition-colors">Calendar</a>
                            <a href="#" className="text-foreground font-semibold border-b-2 border-foreground py-7">Listings</a>
                            <a href="#" className="hover:text-foreground transition-colors">Messages</a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="text-sm font-medium" onClick={() => navigate('/')}>
                            Switch to traveling
                        </Button>
                        <div className="flex items-center gap-2 border rounded-full p-1 pl-3 hover:shadow-md transition-shadow cursor-pointer">
                            <Menu className="h-4 w-4" />
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="/placeholder-user.jpg" />
                                <AvatarFallback>AD</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Your listing</h1>
                    <Button onClick={handleCreateListing} size="icon" className="rounded-full h-10 w-10">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading listings...</div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/10">
                        <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first listing to start hosting</p>
                        <Button onClick={handleCreateListing}>Create Listing</Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b text-left text-sm text-muted-foreground">
                                    <th className="pb-4 font-medium w-[40%]">Listing</th>
                                    <th className="pb-4 font-medium w-[20%]">Type</th>
                                    <th className="pb-4 font-medium w-[20%]">Location</th>
                                    <th className="pb-4 font-medium w-[20%]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {listings.map((listing) => (
                                    <tr key={listing.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/host/preview`)}>
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                                    {listing.photos?.[0]?.url ? (
                                                        <img
                                                            src={listing.photos[0].url}
                                                            alt={listing.title}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                            <Search className="h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium truncate">{listing.title || 'Untitled Listing'}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Your listing started {new Date(listing.updated_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm">{listing.property_type || 'Home'}</td>
                                        <td className="py-4 text-sm">
                                            {listing.city && listing.country
                                                ? `${listing.city}, ${listing.country}`
                                                : <span className="text-muted-foreground">-</span>}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${listing.status === 'published' ? 'bg-green-500' :
                                                    listing.status === 'draft' ? 'bg-gray-300' : 'bg-orange-500'
                                                    }`} />
                                                <span className="text-sm capitalize">{listing.status === 'draft' ? 'In progress' : listing.status}</span>
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
