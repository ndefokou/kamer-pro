import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';
import { getImageUrl, formatPrice } from '@/lib/utils';

const Preview: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { draft, publishListing, saveDraft, previousStep } = useHost();
    const { toast } = useToast();
    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        setIsPublishing(true);

        const result = await publishListing();

        if (result.success) {
            toast({
                title: t('host.preview.publishedTitle', 'Listing published!'),
                description: t('host.preview.publishedDesc', 'Your listing is now live on Le Mboko'),
            });
            navigate('/host/dashboard');
        } else {
            toast({
                title: t('host.preview.publishFailedTitle', 'Failed to publish'),
                description: result.error || (t('host.preview.publishFailedDesc', 'Please check all required fields') as string),
                variant: 'destructive',
            });
        }

        setIsPublishing(false);
    };

    const handleSaveDraft = async () => {
        const result = await saveDraft();
        if (result.success) {
            toast({
                title: t('host.preview.draftSavedTitle', 'Draft saved'),
                description: t('host.preview.draftSavedDesc', 'You can continue editing later'),
            });
            navigate('/host/dashboard');
        } else {
            toast({
                title: t('host.preview.draftSaveFailedTitle', 'Failed to save draft'),
                description: result.error || (t('host.preview.draftSaveFailedDesc', 'Please try again') as string),
                variant: 'destructive',
            });
        }
    };

    const handleBack = () => {
        previousStep();
        navigate('/host/safety');
    };

    const coverPhoto = draft.photos[draft.coverPhotoIndex] || draft.photos[0];

    return (
        <div className="min-h-screen bg-background p-4 py-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">{t('host.preview.title', 'Preview your listing')}</h1>
                    <p className="text-muted-foreground text-lg">
                        {t('host.preview.subtitle', "Here's how your listing will appear to guests")}
                    </p>
                </div>

                {/* Listing Preview */}
                <div className="bg-card border rounded-lg overflow-hidden mb-8">
                    {/* Cover Photo */}
                    {coverPhoto && (
                        <div className="aspect-video w-full overflow-hidden">
                            <img
                                src={getImageUrl(coverPhoto)}
                                alt={draft.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div className="p-6">
                        {/* Title and Price */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{draft.title}</h2>
                                <p className="text-muted-foreground">
                                    {draft.propertyType} • {draft.maxGuests} guests • {draft.bedrooms} bedrooms • {draft.beds} beds • {draft.bathrooms} baths
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">{formatPrice(draft.pricePerNight || 0)}</div>
                                <div className="text-sm text-muted-foreground">{t('host.common.perNight', 'per night')}</div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">{t('host.preview.about', 'About this place')}</h3>
                            <p className="text-muted-foreground">{draft.description}</p>
                        </div>

                        {/* Amenities */}
                        {draft.amenities.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-2">{t('host.preview.offers', 'What this place offers')}</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {draft.amenities.slice(0, 6).map(amenity => (
                                        <div key={amenity} className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-primary" />
                                            <span className="text-sm">{amenity.replace(/_/g, ' ')}</span>
                                        </div>
                                    ))}
                                    {draft.amenities.length > 6 && (
                                        <div className="text-sm text-muted-foreground">
                                            +{draft.amenities.length - 6} {t('host.editor.more', 'more')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Booking Settings */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">{t('host.preview.bookingDetails', 'Booking details')}</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <p>• {draft.instantBook ? t('host.preview.instantAvailable', 'Instant booking available') : t('host.preview.hostApproval', 'Host approval required')}</p>
                                <p>• {t('host.preview.minimumStay', 'Minimum stay')}: {draft.minNights} {draft.minNights !== 1 ? t('common.nights', 'nights') : t('host.preview.night', 'night')}</p>
                                {draft.maxNights && <p>• {t('host.preview.maximumStay', 'Maximum stay')}: {draft.maxNights} {t('common.nights', 'nights')}</p>}
                                {draft.cleaningFee && <p>• {t('host.pricing.cleaningFeeShort', 'Cleaning fee')}: {formatPrice(draft.cleaningFee)}</p>}
                            </div>
                        </div>

                        {/* House Rules */}
                        {draft.houseRules && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-2">{t('host.safety.houseRulesTitle', 'House rules')}</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{draft.houseRules}</p>
                            </div>
                        )}

                        {/* Safety */}
                        {draft.safetyDevices.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">{t('host.preview.safetyFeatures', 'Safety features')}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {draft.safetyDevices.map(device => (
                                        <span key={device} className="px-3 py-1 bg-muted rounded-full text-sm">
                                            {device.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={handleBack}>
                        {t('common.back', 'Back')}
                    </Button>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleSaveDraft}>
                            {t('host.preview.saveDraft', 'Save as draft')}
                        </Button>
                        <Button onClick={handlePublish} disabled={isPublishing} size="lg">
                            {isPublishing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('host.preview.publishing', 'Publishing...')}
                                </>
                            ) : (
                                t('host.preview.publishListing', 'Publish listing')
                            )}
                        </Button>
                    </div>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {t('common.stepOf', 'Step {{current}} of {{total}}', { current: 9, total: 9 })}
                </div>
            </div>
        </div>
    );
};

export default Preview;
