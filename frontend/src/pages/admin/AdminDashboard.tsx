import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminHosts, deleteHost, getAdminReports, AdminHost, AdminReport } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, AlertTriangle, Eye, CheckCircle, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { getHostListings, Product } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('hosts');
    const [adminPassword, setAdminPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [selectedHostId, setSelectedHostId] = useState<number | null>(null);
    const [isListingsModalOpen, setIsListingsModalOpen] = useState(false);


    const { data: hosts, isLoading: isLoadingHosts } = useQuery({
        queryKey: ['admin', 'hosts'],
        queryFn: getAdminHosts,
    });

    const { data: reports, isLoading: isLoadingReports } = useQuery({
        queryKey: ['admin', 'reports'],
        queryFn: getAdminReports,
    });

    const deleteHostMutation = useMutation({
        mutationFn: deleteHost,
        onSuccess: () => {
            toast.success('Host deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['admin', 'hosts'] });
        },
        onError: (error) => {
            console.error('Failed to delete host:', error);
            toast.error('Failed to delete host');
        },
    });

    const handleDeleteHost = (hostId: number) => {
        if (confirm('Are you sure you want to delete this host? This action cannot be undone and will delete all their listings and bookings.')) {
            deleteHostMutation.mutate(hostId);
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminPassword === 'mapiol') {
            setIsAuthenticated(true);
        } else {
            toast.error('Incorrect password');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="Enter admin password"
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Access Dashboard
                        </Button>
                    </form>
                </div>
            </div>
        );
    }


    if (isLoadingHosts || isLoadingReports) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <SEO title="Admin Dashboard" />
            <Header />
            <div className="container mx-auto py-10 px-4 pt-10 md:pt-20">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="rounded-full shrink-0"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-8">
                        <TabsTrigger value="hosts">Hosts Management</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                    </TabsList>

                    <TabsContent value="hosts">
                        <div className="bg-white rounded-lg shadow border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead>Listings</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hosts?.map((host) => (
                                        <TableRow key={host.id}>
                                            <TableCell>{host.id}</TableCell>
                                            <TableCell className="font-medium">{host.username}</TableCell>
                                            <TableCell>{host.email}</TableCell>
                                            <TableCell>{format(new Date(host.created_at), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{host.listing_count}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedHostId(host.id);
                                                            setIsListingsModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Listings
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteHost(host.id)}
                                                        disabled={deleteHostMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {hosts?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No hosts found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="reports">
                        <div className="bg-white rounded-lg shadow border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Reporter ID</TableHead>
                                        <TableHead>Host ID</TableHead>
                                        <TableHead>Listing ID</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>

                                </TableHeader>
                                <TableBody>
                                    {reports?.map((report) => (
                                        <TableRow key={report.id}>
                                            <TableCell>{report.id}</TableCell>
                                            <TableCell>{format(new Date(report.created_at), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{report.reporter_id}</TableCell>
                                            <TableCell>{report.host_id}</TableCell>
                                            <TableCell>{report.listing_id || 'N/A'}</TableCell>
                                            <TableCell className="max-w-md truncate" title={report.reason}>
                                                {report.reason}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {report.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedHostId(report.host_id);
                                                            setIsListingsModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Host
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteHost(report.host_id)}
                                                        disabled={deleteHostMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete Host
                                                    </Button>
                                                </div>
                                            </TableCell>

                                        </TableRow>
                                    ))}
                                    {reports?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                No reports found
                                            </TableCell>

                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Host Listings Modal */}
            <Dialog open={isListingsModalOpen} onOpenChange={setIsListingsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Host Listings (ID: {selectedHostId})</DialogTitle>
                        <DialogDescription>
                            Review all properties listed by this host.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-full max-h-[60vh] mt-4">
                        <HostListingsView hostId={selectedHostId} />
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const HostListingsView: React.FC<{ hostId: number | null }> = ({ hostId }) => {
    const { data: listings, isLoading } = useQuery({
        queryKey: ['admin', 'host-listings', hostId],
        queryFn: () => hostId ? getHostListings(hostId) : Promise.resolve([]),
        enabled: !!hostId,
    });

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!listings || listings.length === 0) return <div className="text-center p-8 text-muted-foreground">No listings found for this host.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((item: Product) => (
                <div key={item.listing.id} className="border rounded-lg overflow-hidden flex flex-col">
                    <div className="aspect-video relative">
                        <OptimizedImage
                            src={getImageUrl(item.photos[0]?.url)}
                            alt={item.listing.title || 'Property'}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.listing.status === 'published' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                {item.listing.status}
                            </span>
                        </div>
                    </div>
                    <div className="p-4 flex-1">
                        <h3 className="font-semibold truncate">{item.listing.title || 'Untitled'}</h3>
                        <p className="text-sm text-muted-foreground">{item.listing.city}, {item.listing.country}</p>
                        <div className="mt-2 text-sm font-medium">
                            {item.listing.price_per_night} {item.listing.currency} / night
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AdminDashboard;
