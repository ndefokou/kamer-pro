import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Zap, Clock } from 'lucide-react';

const BookingSettings: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { draft, updateDraft, nextStep, previousStep } = useHost();

    const [instantBook, setInstantBook] = useState(draft.instantBook || false);
    const [minNights, setMinNights] = useState(draft.minNights || 1);
    const [maxNights, setMaxNights] = useState(draft.maxNights || 30);
    const [maxGuests, setMaxGuests] = useState(draft.maxGuests || 1);
    const [bedrooms, setBedrooms] = useState(draft.bedrooms || 1);
    const [beds, setBeds] = useState(draft.beds || 1);
    const [bathrooms, setBathrooms] = useState(draft.bathrooms || 1);

    const handleContinue = () => {
        updateDraft({
            instantBook,
            minNights,
            maxNights,
            maxGuests,
            bedrooms,
            beds,
            bathrooms,
        });
        nextStep();
        navigate('/host/pricing');
    };

    const handleBack = () => {
        updateDraft({
            instantBook,
            minNights,
            maxNights,
            maxGuests,
            bedrooms,
            beds,
            bathrooms,
        });
        previousStep();
        navigate('/host/description');
    };

    return (
        <div className="min-h-screen bg-background p-4 py-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">{t('host.booking.title', 'Booking settings')}</h1>
                    <p className="text-muted-foreground text-lg">
                        {t('host.booking.subtitle', 'Choose how you want to confirm bookings')}
                    </p>
                </div>

                {/* Booking Method */}
                <div className="mb-8 p-6 border rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">{t('host.booking.methodTitle', 'How do you want to confirm bookings?')}</h2>
                    <RadioGroup
                        value={instantBook ? 'instant' : 'approve'}
                        onValueChange={(value) => setInstantBook(value === 'instant')}
                    >
                        <div className="flex items-start space-x-3 p-4 border rounded-lg mb-3 cursor-pointer hover:bg-accent">
                            <RadioGroupItem value="instant" id="instant" />
                            <div className="flex-1">
                                <Label htmlFor="instant" className="cursor-pointer">
                                    <div className="flex items-center gap-2 font-semibold mb-1">
                                        <Zap className="h-5 w-5 text-primary" />
                                        {t('host.booking.instantBook', 'Instant Book')}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t('host.booking.instantDesc', 'Guests can book instantly without waiting for your approval')}
                                    </p>
                                </Label>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                            <RadioGroupItem value="approve" id="approve" />
                            <div className="flex-1">
                                <Label htmlFor="approve" className="cursor-pointer">
                                    <div className="flex items-center gap-2 font-semibold mb-1">
                                        <Clock className="h-5 w-5 text-primary" />
                                        {t('host.booking.approveRequests', 'Approve requests')}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t('host.booking.approveDesc', "You approve each booking request before it's confirmed")}
                                    </p>
                                </Label>
                            </div>
                        </div>
                    </RadioGroup>
                </div>

                {/* Stay Length */}
                <div className="mb-8 p-6 border rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">{t('host.booking.stayLength', 'Stay length')}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="minNights">{t('host.booking.minNights', 'Minimum nights')}</Label>
                            <Input
                                id="minNights"
                                type="number"
                                min={1}
                                value={minNights}
                                onChange={(e) => setMinNights(parseInt(e.target.value) || 1)}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="maxNights">{t('host.booking.maxNights', 'Maximum nights (optional)')}</Label>
                            <Input
                                id="maxNights"
                                type="number"
                                min={minNights}
                                value={maxNights}
                                onChange={(e) => setMaxNights(parseInt(e.target.value) || 30)}
                                className="mt-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Property Details */}
                <div className="mb-8 p-6 border rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">{t('host.booking.propertyDetails', 'Property details')}</h2>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="maxGuests">{t('host.booking.maxGuests', 'Maximum guests')}</Label>
                            <Input
                                id="maxGuests"
                                type="number"
                                min={1}
                                max={16}
                                value={maxGuests}
                                onChange={(e) => setMaxGuests(parseInt(e.target.value) || 1)}
                                className="mt-2"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="bedrooms">{t('host.booking.bedrooms', 'Bedrooms')}</Label>
                                <Input
                                    id="bedrooms"
                                    type="number"
                                    min={0}
                                    value={bedrooms}
                                    onChange={(e) => setBedrooms(parseInt(e.target.value) || 0)}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label htmlFor="beds">{t('host.booking.beds', 'Beds')}</Label>
                                <Input
                                    id="beds"
                                    type="number"
                                    min={1}
                                    value={beds}
                                    onChange={(e) => setBeds(parseInt(e.target.value) || 1)}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label htmlFor="bathrooms">{t('host.booking.bathrooms', 'Bathrooms')}</Label>
                                <Input
                                    id="bathrooms"
                                    type="number"
                                    min={0.5}
                                    step={0.5}
                                    value={bathrooms}
                                    onChange={(e) => setBathrooms(parseFloat(e.target.value) || 1)}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-12 pt-6 border-t">
                    <Button variant="outline" onClick={handleBack}>
                        {t('common.back', 'Back')}
                    </Button>
                    <Button onClick={handleContinue} size="lg">
                        {t('common.continue', 'Continue')}
                    </Button>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {t('common.stepOf', 'Step {{current}} of {{total}}', { current: 6, total: 9 })}
                </div>
            </div>
        </div>
    );
};

export default BookingSettings;
