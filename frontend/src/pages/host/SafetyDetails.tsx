import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Flame, Heart, Camera } from 'lucide-react';

const safetyDevicesList = [
    { id: 'smoke_alarm', label: 'Smoke alarm', icon: ShieldAlert },
    { id: 'carbon_monoxide_alarm', label: 'Carbon monoxide alarm', icon: ShieldAlert },
    { id: 'fire_extinguisher', label: 'Fire extinguisher', icon: Flame },
    { id: 'first_aid_kit', label: 'First aid kit', icon: Heart },
];

const SafetyDetails: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { draft, updateDraft, nextStep, previousStep } = useHost();

    const [safetyDevices, setSafetyDevices] = useState<string[]>(draft.safetyDevices || []);
    const [houseRules, setHouseRules] = useState(draft.houseRules || '');

    const toggleDevice = (deviceId: string) => {
        setSafetyDevices(prev =>
            prev.includes(deviceId)
                ? prev.filter(id => id !== deviceId)
                : [...prev, deviceId]
        );
    };

    const handleContinue = () => {
        updateDraft({ safetyDevices, houseRules });
        nextStep();
        navigate('/host/preview');
    };

    const handleBack = () => {
        updateDraft({ safetyDevices, houseRules });
        previousStep();
        navigate('/host/pricing');
    };

    return (
        <div className="min-h-screen bg-background p-4 py-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">{t('host.safety.title', 'Safety and house rules')}</h1>
                    <p className="text-muted-foreground text-lg">
                        {t('host.safety.subtitle', 'Help guests feel safe and know what to expect')}
                    </p>
                </div>

                {/* Safety Devices */}
                <div className="mb-8 p-6 border rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">{t('host.safety.devicesTitle', 'Safety devices')}</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('host.safety.devicesHelp', 'Select all safety devices available at your property')}
                    </p>
                    <div className="space-y-3">
                        {safetyDevicesList.map(device => {
                            const Icon = device.icon;
                            const isChecked = safetyDevices.includes(device.id);
                            return (
                                <div key={device.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent">
                                    <Checkbox
                                        id={device.id}
                                        checked={isChecked}
                                        onCheckedChange={() => toggleDevice(device.id)}
                                    />
                                    <Label
                                        htmlFor={device.id}
                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                    >
                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                        <span>{t(`amenities.${device.id}`, device.label)}</span>
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* House Rules */}
                <div className="mb-8 p-6 border rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">{t('host.safety.houseRulesTitle', 'House rules')}</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('host.safety.houseRulesHelp', 'Set clear expectations for your guests')}
                    </p>
                    <Textarea
                        value={houseRules}
                        onChange={(e) => setHouseRules(e.target.value)}
                        placeholder={t('host.safety.houseRulesPlaceholder', 'e.g., No smoking, No pets, No parties or events, Quiet hours: 10 PM - 8 AM') as string}
                        className="min-h-[150px]"
                    />
                    <div className="mt-4 bg-muted p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">{t('host.safety.commonRulesTitle', 'Common house rules:')}</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• {t('host.safety.rules.noSmoking', 'No smoking')}</li>
                            <li>• {t('host.safety.rules.noPets', 'No pets')}</li>
                            <li>• {t('host.safety.rules.noParties', 'No parties or events')}</li>
                            <li>• {t('host.safety.rules.quietHours', 'Quiet hours (e.g., 10 PM - 8 AM)')}</li>
                            <li>• {t('host.safety.rules.checkInOut', 'Check-in/check-out times')}</li>
                        </ul>
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
                    {t('common.stepOf', 'Step {{current}} of {{total}}', { current: 8, total: 9 })}
                </div>
            </div>
        </div>
    );
};

export default SafetyDetails;
