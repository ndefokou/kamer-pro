import React, { useState, useEffect } from 'react';
import { useNetworkInfo } from '../services/networkService';
import { dbService } from '../services/dbService';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';

interface CacheStats {
    listings: number;
    images: number;
    bookings: number;
    messages: number;
}

export const NetworkStatusIndicator: React.FC = () => {
    const networkInfo = useNetworkInfo();
    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const loadCacheStats = async () => {
            const stats = await dbService.getCacheStats();
            setCacheStats(stats);
        };

        loadCacheStats();

        // Update cache stats every 10 seconds
        const interval = setInterval(loadCacheStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const getConnectionIcon = () => {
        if (!networkInfo.isOnline) {
            return <WifiOff className="w-4 h-4" />;
        }

        switch (networkInfo.quality) {
            case 'poor':
                return <SignalLow className="w-4 h-4" />;
            case 'moderate':
                return <SignalMedium className="w-4 h-4" />;
            case 'good':
            case 'excellent':
                return <SignalHigh className="w-4 h-4" />;
            default:
                return <Wifi className="w-4 h-4" />;
        }
    };

    const getConnectionColor = () => {
        if (!networkInfo.isOnline) return 'text-red-600 bg-red-50';

        switch (networkInfo.quality) {
            case 'poor':
                return 'text-orange-600 bg-orange-50';
            case 'moderate':
                return 'text-yellow-600 bg-yellow-50';
            case 'good':
                return 'text-green-600 bg-green-50';
            case 'excellent':
                return 'text-blue-600 bg-blue-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getConnectionText = () => {
        if (!networkInfo.isOnline) return 'Offline';

        switch (networkInfo.quality) {
            case 'poor':
                return 'Slow Connection';
            case 'moderate':
                return 'Moderate Connection';
            case 'good':
                return 'Good Connection';
            case 'excellent':
                return 'Excellent Connection';
            default:
                return 'Online';
        }
    };

    const getTotalCachedItems = (): number => {
        if (!cacheStats) return 0;
        return Object.values(cacheStats).reduce((sum: number, count: number) => sum + count, 0);
    };

    // Only show indicator if offline or slow connection
    const shouldShow = !networkInfo.isOnline || networkInfo.quality === 'poor' || networkInfo.quality === 'moderate';

    if (!shouldShow && !showDetails) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg cursor-pointer transition-all ${getConnectionColor()}`}
                onClick={() => setShowDetails(!showDetails)}
            >
                {getConnectionIcon()}
                <span className="text-sm font-medium">{getConnectionText()}</span>
                {!networkInfo.isOnline && cacheStats && (
                    <span className="text-xs opacity-75">
                        ({getTotalCachedItems()} cached items)
                    </span>
                )}
            </div>

            {showDetails && (
                <div className="mt-2 bg-white rounded-lg shadow-xl p-4 min-w-[280px] border border-gray-200">
                    <h3 className="font-semibold text-sm mb-3">Network Details</h3>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium">
                                {networkInfo.isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>

                        {networkInfo.isOnline && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Connection Type:</span>
                                    <span className="font-medium uppercase">
                                        {networkInfo.connectionType}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600">Quality:</span>
                                    <span className="font-medium capitalize">
                                        {networkInfo.quality}
                                    </span>
                                </div>

                                {networkInfo.downlink && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Speed:</span>
                                        <span className="font-medium">
                                            {networkInfo.downlink.toFixed(1)} Mbps
                                        </span>
                                    </div>
                                )}

                                {networkInfo.rtt && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Latency:</span>
                                        <span className="font-medium">
                                            {networkInfo.rtt} ms
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {cacheStats && (
                            <>
                                <div className="border-t border-gray-200 my-2 pt-2">
                                    <div className="font-medium mb-1">Cached Data:</div>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600">Listings:</span>
                                    <span className="font-medium">{cacheStats.listings}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600">Images:</span>
                                    <span className="font-medium">{cacheStats.images}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600">Bookings:</span>
                                    <span className="font-medium">{cacheStats.bookings}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600">Messages:</span>
                                    <span className="font-medium">{cacheStats.messages}</span>
                                </div>

                                <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 mt-2">
                                    <span>Total:</span>
                                    <span>{getTotalCachedItems()}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={async () => {
                            if (confirm('Clear all cached data? This will free up storage but may slow down the app temporarily.')) {
                                await dbService.clearAllCache();
                                const stats = await dbService.getCacheStats();
                                setCacheStats(stats);
                            }
                        }}
                        className="mt-3 w-full text-xs py-2 px-3 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                    >
                        Clear Cache
                    </button>
                </div>
            )}
        </div>
    );
};

export default NetworkStatusIndicator;
