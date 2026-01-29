/**
 * Example: Optimized Search Results Page
 * 
 * This example shows how to integrate all network optimization features
 * into a typical listing search page.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/client';
import { usePagination, useInfiniteScroll } from '../hooks/usePagination';
import { useConnectionQuality } from '../services/networkService';
import OptimizedImage from '../components/OptimizedImage';
import { Loader2, WifiOff, Signal } from 'lucide-react';

interface SearchFilters {
    search?: string;
    category?: string;
    location?: string;
    min_price?: string;
    max_price?: string;
    guests?: number;
}

export const OptimizedSearchResults: React.FC = () => {
    const [filters, setFilters] = useState<SearchFilters>({});
    const [allListings, setAllListings] = useState<any[]>([]);

    // Network-aware pagination
    const pagination = usePagination({
        adaptivePageSize: true, // Automatically adjusts based on connection
    });

    // Connection quality info
    const {
        isOnline,
        isSlowConnection,
        shouldReduceQuality,
        recommendedPageSize,
        quality,
    } = useConnectionQuality();

    // Fetch listings with pagination
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['listings', filters, pagination.offset, pagination.pageSize],
        queryFn: () => getProducts({
            ...filters,
            limit: pagination.pageSize,
            offset: pagination.offset,
        }),
        // Enable caching
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });

    // Update listings and pagination state
    useEffect(() => {
        if (data) {
            if (pagination.page === 0) {
                // First page - replace all
                setAllListings(data);
            } else {
                // Subsequent pages - append
                setAllListings(prev => [...prev, ...data]);
            }

            // Update hasMore flag
            pagination.setHasMore(data.length === pagination.pageSize);
        }
    }, [data]);

    // Reset when filters change
    useEffect(() => {
        setAllListings([]);
        pagination.reset();
    }, [filters]);

    // Infinite scroll
    const { setObserverTarget } = useInfiniteScroll({
        onLoadMore: () => {
            if (!isLoading && pagination.hasMore) {
                pagination.nextPage();
            }
        },
        hasMore: pagination.hasMore,
        isLoading,
    });

    // Connection status banner
    const ConnectionBanner = () => {
        if (!isOnline) {
            return (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                    <WifiOff className="w-5 h-5 text-orange-600" />
                    <div>
                        <p className="font-medium text-orange-900">You're offline</p>
                        <p className="text-sm text-orange-700">
                            Showing cached results. Some features may be limited.
                        </p>
                    </div>
                </div>
            );
        }

        if (isSlowConnection) {
            return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                    <Signal className="w-5 h-5 text-yellow-600" />
                    <div>
                        <p className="font-medium text-yellow-900">Slow connection detected</p>
                        <p className="text-sm text-yellow-700">
                            Showing {recommendedPageSize} items per page to save data.
                            Images are optimized for your connection.
                        </p>
                    </div>
                </div>
            );
        }

        return null;
    };

    // Listing card component
    const ListingCard = ({ listing, index }: { listing: any; index: number }) => (
        <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {/* Optimized image with lazy loading */}
            <OptimizedImage
                src={listing.photos[0]?.url}
                alt={listing.listing.title}
                className="w-full h-48 object-cover"
                priority={index < 4} // First 4 images load immediately
                quality={shouldReduceQuality ? 'low' : undefined}
            />

            <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">
                    {listing.listing.title}
                </h3>

                <p className="text-gray-600 text-sm mb-2">
                    {listing.listing.city}, {listing.listing.country}
                </p>

                <div className="flex items-center justify-between">
                    <div>
                        <span className="font-bold text-lg">
                            {listing.listing.price_per_night} {listing.listing.currency}
                        </span>
                        <span className="text-gray-600 text-sm"> / night</span>
                    </div>

                    {listing.listing.max_guests && (
                        <span className="text-sm text-gray-600">
                            Up to {listing.listing.max_guests} guests
                        </span>
                    )}
                </div>

                {/* Show if data is from cache */}
                {!isOnline && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                        Cached data
                    </div>
                )}
            </div>
        </div>
    );

    // Loading skeleton
    const LoadingSkeleton = () => (
        <div className="border rounded-lg overflow-hidden animate-pulse">
            <div className="w-full h-48 bg-gray-200" />
            <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Find Your Perfect Stay</h1>

            {/* Connection status */}
            <ConnectionBanner />

            {/* Search filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                    type="text"
                    placeholder="Search..."
                    className="border rounded-lg px-4 py-2"
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />

                <select
                    className="border rounded-lg px-4 py-2"
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                    <option value="">All Categories</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="studio">Studio</option>
                </select>

                <input
                    type="number"
                    placeholder="Max guests"
                    className="border rounded-lg px-4 py-2"
                    onChange={(e) => setFilters(prev => ({
                        ...prev,
                        guests: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                />
            </div>

            {/* Results info */}
            <div className="mb-4 flex items-center justify-between">
                <p className="text-gray-600">
                    {allListings.length} listing{allListings.length !== 1 ? 's' : ''} found
                    {quality && (
                        <span className="ml-2 text-sm">
                            (Connection: {quality})
                        </span>
                    )}
                </p>

                {!isOnline && (
                    <button
                        onClick={() => refetch()}
                        className="text-sm text-blue-600 hover:text-blue-800"
                        disabled={!isOnline}
                    >
                        Refresh when online
                    </button>
                )}
            </div>

            {/* Error state */}
            {error && !allListings.length && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-red-900 font-medium">Failed to load listings</p>
                    <p className="text-red-700 text-sm mt-1">
                        {isOnline ? 'Please try again' : 'Check your internet connection'}
                    </p>
                    {isOnline && (
                        <button
                            onClick={() => refetch()}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Retry
                        </button>
                    )}
                </div>
            )}

            {/* Listings grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allListings.map((listing, index) => (
                    <ListingCard
                        key={listing.listing.id}
                        listing={listing}
                        index={index}
                    />
                ))}

                {/* Loading skeletons */}
                {isLoading && (
                    <>
                        {Array.from({ length: recommendedPageSize }).map((_, i) => (
                            <LoadingSkeleton key={`skeleton-${i}`} />
                        ))}
                    </>
                )}
            </div>

            {/* Empty state */}
            {!isLoading && allListings.length === 0 && !error && (
                <div className="text-center py-12">
                    <p className="text-gray-600 text-lg">No listings found</p>
                    <p className="text-gray-500 text-sm mt-2">
                        Try adjusting your search filters
                    </p>
                </div>
            )}

            {/* Infinite scroll trigger */}
            {pagination.hasMore && !isLoading && (
                <div
                    ref={setObserverTarget}
                    className="h-20 flex items-center justify-center"
                >
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            )}

            {/* End of results */}
            {!pagination.hasMore && allListings.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                    You've reached the end of the results
                </div>
            )}

            {/* Network quality indicator for slow connections */}
            {isSlowConnection && (
                <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800 shadow-lg">
                    <p className="font-medium">Data Saver Active</p>
                    <p className="text-xs mt-1">
                        Loading {recommendedPageSize} items at a time
                    </p>
                </div>
            )}
        </div>
    );
};

export default OptimizedSearchResults;
