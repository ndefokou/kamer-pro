import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showReconnected, setShowReconnected] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            // Hide "reconnected" message after 3 seconds
            setTimeout(() => setShowReconnected(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Show reconnected message briefly
    if (showReconnected) {
        return (
            <div className="fixed top-0 left-0 right-0 bg-green-500 text-white text-center py-2 px-4 z-50 shadow-lg animate-slide-down">
                <div className="flex items-center justify-center gap-2">
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm font-medium">
                        {t('Back online')}
                    </span>
                </div>
            </div>
        );
    }

    // Show offline indicator
    if (!isOnline) {
        return (
            <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 px-4 z-50 shadow-lg">
                <div className="flex items-center justify-center gap-2">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm font-medium">
                        {t("You're offline. Showing cached data.")}
                    </span>
                </div>
            </div>
        );
    }

    return null;
};

export default OfflineIndicator;
