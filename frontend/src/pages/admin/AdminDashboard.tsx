import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminHosts, deleteHost, getAdminReports, AdminHost, AdminReport } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('hosts');
    const [adminPassword, setAdminPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);


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
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

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
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteHost(host.id)}
                                                disabled={deleteHostMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
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
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteHost(report.host_id)}
                                                disabled={deleteHostMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Host
                                            </Button>
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
    );
};

export default AdminDashboard;
