import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Mail, MessageSquare, Facebook, Twitter, Code, MessageCircle } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { toast } from "sonner";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    listing: {
        title?: string;
        photos: { url: string; is_cover?: boolean | number }[];
        property_type?: string;
        city?: string;
        rating?: number;
        bedrooms?: number;
        beds?: number;
        bathrooms?: number;
    };
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, listing }) => {
    const currentUrl = window.location.href;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(currentUrl);
        toast.success("Link copied to clipboard!");
    };

    const handleEmailShare = () => {
        const subject = `Check out this place: ${listing.title || 'Amazing Place'}`;
        const body = `I found this amazing place on Le Mboko and thought you'd love it:\n\n${listing.title || 'Amazing Place'}\n${currentUrl}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    const handleWhatsAppShare = () => {
        const text = `Check out this place: ${listing.title || 'Amazing Place'} - ${currentUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleMessagesShare = () => {
        const body = `Check out this place: ${listing.title || 'Amazing Place'} - ${currentUrl}`;
        window.open(`sms:?body=${encodeURIComponent(body)}`);
    };

    const handleFacebookShare = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
    };

    const handleTwitterShare = () => {
        const text = `Check out this place: ${listing.title || 'Amazing Place'}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentUrl)}`, '_blank');
    };

    const handleMessengerShare = () => {
        // Facebook Messenger sharing usually requires the FB SDK or mobile deep links.
        // For web, we can try the deep link or just redirect to FB.
        // Using a generic approach here as web support is limited without SDK.
        window.open(`fb-messenger://share/?link=${encodeURIComponent(currentUrl)}`);
    };

    const handleEmbed = () => {
        const embedCode = `<iframe src="${currentUrl}" width="600" height="400" frameborder="0"></iframe>`;
        navigator.clipboard.writeText(embedCode);
        toast.success("Embed code copied to clipboard!");
    };

    const coverPhoto = listing.photos.find(p => p.is_cover) || listing.photos[0];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl">
                <div className="p-6 pb-0">
                    <div className="flex items-center justify-between mb-4">
                        <DialogTitle className="text-xl font-bold">Partager cette annonce</DialogTitle>
                        {/* Close button is handled by DialogPrimitive.Close usually, but we can add one if needed or rely on default X */}
                    </div>
                </div>

                <div className="px-6 pb-6">
                    {/* Listing Preview */}
                    <div className="flex gap-4 mb-8">
                        <div className="h-24 w-24 rounded-xl overflow-hidden flex-shrink-0">
                            <img
                                src={getImageUrl(coverPhoto?.url)}
                                alt={listing.title}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h3 className="font-medium text-gray-900 line-clamp-2">
                                {listing.title || 'Amazing Place'}
                            </h3>
                            <div className="text-sm text-gray-500 mt-1">
                                {listing.property_type || 'Property'} · {listing.city || 'Location'} · {listing.bedrooms || 0} bedroom{listing.bedrooms !== 1 ? 's' : ''} · {listing.beds || 0} bed{listing.beds !== 1 ? 's' : ''} · {listing.bathrooms || 0} bath{listing.bathrooms !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    {/* Share Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="h-14 justify-start px-4 border-gray-200 hover:bg-gray-50 hover:border-black rounded-xl gap-3"
                            onClick={handleCopyLink}
                        >
                            <Copy className="h-5 w-5" />
                            <span className="font-medium">Copier le lien</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-14 justify-start px-4 border-gray-200 hover:bg-gray-50 hover:border-black rounded-xl gap-3"
                            onClick={handleEmailShare}
                        >
                            <Mail className="h-5 w-5" />
                            <span className="font-medium">E-mail</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-14 justify-start px-4 border-gray-200 hover:bg-gray-50 hover:border-black rounded-xl gap-3"
                            onClick={handleMessagesShare}
                        >
                            <MessageSquare className="h-5 w-5" />
                            <span className="font-medium">Messages</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-14 justify-start px-4 border-gray-200 hover:bg-gray-50 hover:border-black rounded-xl gap-3"
                            onClick={handleWhatsAppShare}
                        >
                            <MessageCircle className="h-5 w-5" />
                            <span className="font-medium">WhatsApp</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-14 justify-start px-4 border-gray-200 hover:bg-gray-50 hover:border-black rounded-xl gap-3"
                            onClick={handleMessengerShare}
                        >
                            <MessageCircle className="h-5 w-5" /> {/* Using MessageCircle as generic for Messenger */}
                            <span className="font-medium">Messenger</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-14 justify-start px-4 border-gray-200 hover:bg-gray-50 hover:border-black rounded-xl gap-3"
                            onClick={handleFacebookShare}
                        >
                            <Facebook className="h-5 w-5" />
                            <span className="font-medium">Facebook</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-14 justify-start px-4 border-gray-200 hover:bg-gray-50 hover:border-black rounded-xl gap-3"
                            onClick={handleTwitterShare}
                        >
                            <Twitter className="h-5 w-5" />
                            <span className="font-medium">Twitter</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-14 justify-start px-4 border-gray-200 hover:bg-gray-50 hover:border-black rounded-xl gap-3"
                            onClick={handleEmbed}
                        >
                            <Code className="h-5 w-5" />
                            <span className="font-medium">Intégrer</span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShareModal;
