import { useState, useEffect } from 'react';

export type ConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
export type ConnectionQuality = 'poor' | 'moderate' | 'good' | 'excellent';

export interface NetworkInfo {
    isOnline: boolean;
    connectionType: ConnectionType;
    quality: ConnectionQuality;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
}

interface NetworkConnection extends EventTarget {
    readonly effectiveType?: string;
    readonly downlink?: number;
    readonly rtt?: number;
    readonly saveData?: boolean;
    readonly type?: string;
    addEventListener(type: 'change', listener: (this: NetworkConnection, ev: Event) => void, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: 'change', listener: (this: NetworkConnection, ev: Event) => void, options?: boolean | AddEventListenerOptions): void;
}

class NetworkService {
    private listeners: Set<(info: NetworkInfo) => void> = new Set();
    private currentInfo: NetworkInfo = this.getNetworkInfo();

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleConnectionChange);
            window.addEventListener('offline', this.handleConnectionChange);

            // Listen to connection changes
            const connection = this.getConnection();
            if (connection) {
                connection.addEventListener('change', this.handleConnectionChange);
            }
        }
    }

    private getConnection(): NetworkConnection | null {
        const nav = navigator as unknown as Record<string, NetworkConnection | undefined>;
        return (
            nav.connection ||
            nav.mozConnection ||
            nav.webkitConnection ||
            null
        );
    }

    private handleConnectionChange = () => {
        this.currentInfo = this.getNetworkInfo();
        this.notifyListeners();
    };

    private getConnectionType(): ConnectionType {
        const connection = this.getConnection();

        if (!connection) return 'unknown';

        const effectiveType = connection.effectiveType;

        if (effectiveType === 'slow-2g') return 'slow-2g';
        if (effectiveType === '2g') return '2g';
        if (effectiveType === '3g') return '3g';
        if (effectiveType === '4g') return '4g';

        // Check if on WiFi
        const type = connection.type;
        if (type === 'wifi') return 'wifi';

        return 'unknown';
    }

    private getConnectionQuality(): ConnectionQuality {
        const connection = this.getConnection();

        if (!connection) return 'good';

        const effectiveType = connection.effectiveType;
        const rtt = connection.rtt || 0;
        const downlink = connection.downlink || 10;

        // Poor: slow-2g, 2g, or high RTT
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || rtt > 500) {
            return 'poor';
        }

        // Moderate: 3g or moderate RTT
        if (effectiveType === '3g' || rtt > 200 || downlink < 1.5) {
            return 'moderate';
        }

        // Excellent: 4g with good metrics
        if (effectiveType === '4g' && rtt < 100 && downlink > 5) {
            return 'excellent';
        }

        // Good: default for 4g
        return 'good';
    }

    getNetworkInfo(): NetworkInfo {
        const connection = this.getConnection();

        return {
            isOnline: navigator.onLine,
            connectionType: this.getConnectionType(),
            quality: this.getConnectionQuality(),
            effectiveType: connection?.effectiveType,
            downlink: connection?.downlink,
            rtt: connection?.rtt,
            saveData: connection?.saveData || false,
        };
    }

    subscribe(callback: (info: NetworkInfo) => void): () => void {
        this.listeners.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(callback => callback(this.currentInfo));
    }

    getCurrentInfo(): NetworkInfo {
        return this.currentInfo;
    }

    // Helper methods for common checks
    isSlowConnection(): boolean {
        const { quality, connectionType } = this.currentInfo;
        return quality === 'poor' || connectionType === 'slow-2g' || connectionType === '2g';
    }

    shouldReduceQuality(): boolean {
        const { quality, saveData } = this.currentInfo;
        return quality === 'poor' || quality === 'moderate' || saveData === true;
    }

    shouldPreloadImages(): boolean {
        const { quality, connectionType } = this.currentInfo;
        return quality === 'excellent' || quality === 'good' || connectionType === 'wifi';
    }

    shouldEnableBackgroundSync(): boolean {
        const { isOnline, quality } = this.currentInfo;
        return isOnline && (quality === 'good' || quality === 'excellent');
    }

    getRecommendedImageQuality(): 'low' | 'medium' | 'high' {
        const { quality, saveData } = this.currentInfo;

        if (saveData || quality === 'poor') return 'low';
        if (quality === 'moderate') return 'medium';
        return 'high';
    }

    getRecommendedPageSize(): number {
        const { quality } = this.currentInfo;

        if (quality === 'poor') return 5;
        if (quality === 'moderate') return 10;
        if (quality === 'good') return 20;
        return 30;
    }
}

// Export singleton instance
export const networkService = new NetworkService();

// React hook for using network info
export function useNetworkInfo(): NetworkInfo {
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(
        networkService.getCurrentInfo()
    );

    useEffect(() => {
        const unsubscribe = networkService.subscribe(setNetworkInfo);
        return unsubscribe;
    }, []);

    return networkInfo;
}

// React hook for connection quality checks
export function useConnectionQuality() {
    const networkInfo = useNetworkInfo();

    return {
        isOnline: networkInfo.isOnline,
        isSlowConnection: networkService.isSlowConnection(),
        shouldReduceQuality: networkService.shouldReduceQuality(),
        shouldPreloadImages: networkService.shouldPreloadImages(),
        recommendedImageQuality: networkService.getRecommendedImageQuality(),
        recommendedPageSize: networkService.getRecommendedPageSize(),
        quality: networkInfo.quality,
        connectionType: networkInfo.connectionType,
    };
}

export default networkService;
