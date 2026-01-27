import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const Pricing: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { draft, updateDraft, nextStep, previousStep } = useHost();

    const [pricePerNight, setPricePerNight] = useState(draft.pricePerNight || 0);
    const [cleaningFee, setCleaningFee] = useState(draft.cleaningFee || 0);

    const isValid = pricePerNight > 0;

    // Calculate estimated earnings (example: 5 nights/month)
    const estimatedNights = 5;
    const totalPerBooking = pricePerNight * 3 + cleaningFee; // Assuming 3 nights average
    const monthlyEstimate = estimatedNights * pricePerNight + cleaningFee * (estimatedNights / 3);

    const handleContinue = () => {
        if (isValid) {
            updateDraft({ pricePerNight, cleaningFee });
            nextStep();
            navigate('/host/safety');
        }
    };

    const handleBack = () => {
        updateDraft({ pricePerNight, cleaningFee });
        previousStep();
        navigate('/host/booking-settings');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">{t('host.pricing.title', 'Now, set your price')}</h1>
                    <p className="text-muted-foreground text-lg">
                        {t('host.pricing.subtitle', 'You can change it anytime')}
                    </p>
                </div>

                <div className="mb-8 p-6 border rounded-lg">
                    <div className="mb-6">
                        <Label htmlFor="pricePerNight" className="text-lg">{t('host.pricing.pricePerNight', 'Price per night (FCFA)')}</Label>
                        <div className="relative mt-2">
                            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="pricePerNight"
                                type="number"
                                min={0}
                                value={pricePerNight || ''}
                                onChange={(e) => setPricePerNight(parseFloat(e.target.value) || 0)}
                                className="pl-10 text-2xl h-16"
                                placeholder={t('common.zero', '0') as string}
                            />
                        </div>
                        {pricePerNight > 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                                {t('host.pricing.priceShown', 'Guests will see this price per night')}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="cleaningFee" className="text-lg">{t('host.pricing.cleaningFee', 'Cleaning fee (optional)')}</Label>
                        <div className="relative mt-2">
                            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="cleaningFee"
                                type="number"
                                min={0}
                                value={cleaningFee || ''}
                                onChange={(e) => setCleaningFee(parseFloat(e.target.value) || 0)}
                                className="pl-10"
                                placeholder={t('common.zero', '0') as string}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            {t('host.pricing.cleaningFeeHelp', 'One-time fee charged per booking')}
                        </p>
                    </div>
                </div>

                {pricePerNight > 0 && (
                    <div className="bg-muted p-6 rounded-lg mb-8">
                        <h3 className="font-semibold mb-4">{t('host.pricing.breakdownTitle', 'Price breakdown example (3 nights)')}</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>{formatPrice(pricePerNight)} × {3} {t('common.nights', 'nights')}</span>
                                <span>{formatPrice(pricePerNight * 3)}</span>
                            </div>
                            {cleaningFee > 0 && (
                                <div className="flex justify-between">
                                    <span>{t('host.pricing.cleaningFeeShort', 'Cleaning fee')}</span>
                                    <span>{formatPrice(cleaningFee)}</span>
                                </div>
                            )}
                            <div className="border-t pt-2 flex justify-between font-semibold">
                                <span>{t('common.total', 'Total')}</span>
                                <span>{formatPrice(totalPerBooking)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            {t('host.pricing.estimatedMonthly', 'Estimated monthly earnings')}: {formatPrice(monthlyEstimate)}
                            <br />
                            {t('host.pricing.estimateHint', '(Based on {{n}} nights booked per month)', { n: estimatedNights })}
                        </p>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={handleBack}>
                        {t('common.back', 'Back')}
                    </Button>
                    <Button onClick={handleContinue} disabled={!isValid} size="lg">
                        {t('common.continue', 'Continue')}
                    </Button>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {t('common.stepOf', 'Step {{current}} of {{total}}', { current: 7, total: 9 })}
                </div>
            </div>
        </div>
    );
};

export default Pricing;
