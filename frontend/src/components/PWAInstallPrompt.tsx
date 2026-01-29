import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);

            // Check if user has already dismissed or installed
            const hasInstalled = localStorage.getItem('pwa_installed');
            const hasDismissed = localStorage.getItem('pwa_dismissed');

            if (!hasInstalled && !hasDismissed) {
                // Delay the popup slightly so it's not immediate on page load
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 3000);
                return () => clearTimeout(timer);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Also check if the app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            localStorage.setItem('pwa_installed', 'true');
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            localStorage.setItem('pwa_installed', 'true');
        } else {
            console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
        setIsOpen(false);
    };

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem('pwa_dismissed', 'true');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md top-4 translate-y-0 data-[state=open]:slide-in-from-top-0">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-green-600" />
                        leMboko
                    </DialogTitle>
                    <DialogDescription>
                        Connect with host in cameroun having guest house and book your own
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center py-6">
                    <div className="relative">
                        <img
                            src="/logo.png"
                            alt="Le Mboko Icon"
                            className="w-24 h-24 rounded-2xl shadow-xl border-4 border-white"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                            <Download className="w-4 h-4" />
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDismiss}
                        className="w-full sm:w-auto order-2 sm:order-1"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        type="button"
                        variant="default"
                        onClick={handleInstall}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white order-1 sm:order-2"
                    >
                        Installer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PWAInstallPrompt;
