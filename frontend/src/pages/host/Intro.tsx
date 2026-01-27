import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Home, Building2, Hotel, Castle } from 'lucide-react';

const propertyTypes = [
    { id: 'apartment', label: 'Apartment', icon: Building2, description: 'A place within a multi-unit building' },
    { id: 'house', label: 'House', icon: Home, description: 'A standalone home' },
    { id: 'villa', label: 'Villa', icon: Castle, description: 'A luxurious standalone property' },
    { id: 'studio', label: 'Studio', icon: Hotel, description: 'A single-room living space' },
];

const Intro: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { draft, updateDraft, nextStep } = useHost();
    const [selectedType, setSelectedType] = React.useState(draft.propertyType || '');

    // Ensure user has authentication tokens
    React.useEffect(() => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            // Should not happen due to ProtectedRoute, but good for safety
            // We could redirect here or just do nothing
        }
    }, []);

    const handleContinue = () => {
        if (selectedType) {
            updateDraft({ propertyType: selectedType });
            nextStep();
            navigate('/host/amenities');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-3xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {t('host.intro.title', "Welcome! Let's get started listing your space")}
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        {t('host.intro.subtitle', 'Tell us what kind of place you have')}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {propertyTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`p-6 rounded-lg border-2 transition-all text-left ${selectedType === type.id
                                    ? 'border-primary bg-primary/5 shadow-lg'
                                    : 'border-border hover:border-primary/50 hover:shadow-md'
                                    }`}
                            >
                                <Icon className="h-12 w-12 mb-4 text-primary" />
                                <h3 className="text-xl font-bold mb-2">{t(`propertyTypes.${type.id}.label`, type.label)}</h3>
                                <p className="text-muted-foreground">{t(`propertyTypes.${type.id}.desc`, type.description)}</p>
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                    >
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                        onClick={handleContinue}
                        disabled={!selectedType}
                        size="lg"
                    >
                        {t('common.continue', 'Continue')}
                    </Button>
                </div>

                <div className="mt-8 text-center text-sm text-muted-foreground">
                    {t('common.stepOf', 'Step {{current}} of {{total}}', { current: 1, total: 9 })}
                </div>
            </div>
        </div>
    );
};

export default Intro;
