import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import {
    Wifi,
    Utensils,
    Car,
    Waves,
    Wind,
    Flame,
    Tv,
    WashingMachine,
    Laptop,
    ShieldAlert,
    Camera,
    Lock
} from 'lucide-react';

const amenitiesList = [
    // Essentials
    { id: 'wifi', label: 'Wifi', icon: Wifi, category: 'Essentials' },
    { id: 'kitchen', label: 'Kitchen', icon: Utensils, category: 'Essentials' },
    { id: 'parking', label: 'Free parking', icon: Car, category: 'Essentials' },
    { id: 'air_conditioning', label: 'Air conditioning', icon: Wind, category: 'Essentials' },
    { id: 'heating', label: 'Heating', icon: Flame, category: 'Essentials' },
    { id: 'tv', label: 'TV', icon: Tv, category: 'Features' },
    { id: 'washer', label: 'Washer', icon: WashingMachine, category: 'Features' },
    { id: 'workspace', label: 'Dedicated workspace', icon: Laptop, category: 'Features' },
    { id: 'pool', label: 'Pool', icon: Waves, category: 'Features' },
    // Safety
    { id: 'smoke_alarm', label: 'Smoke alarm', icon: ShieldAlert, category: 'Safety' },
    { id: 'carbon_monoxide_alarm', label: 'Carbon monoxide alarm', icon: ShieldAlert, category: 'Safety' },
    { id: 'security_cameras', label: 'Security cameras', icon: Camera, category: 'Safety' },
    { id: 'lock_on_bedroom', label: 'Lock on bedroom door', icon: Lock, category: 'Safety' },
];

const Amenities: React.FC = () => {
    const navigate = useNavigate();
    const { draft, updateDraft, nextStep, previousStep } = useHost();
    const [selectedAmenities, setSelectedAmenities] = React.useState<string[]>(draft.amenities || []);

    const toggleAmenity = (amenityId: string) => {
        setSelectedAmenities(prev =>
            prev.includes(amenityId)
                ? prev.filter(id => id !== amenityId)
                : [...prev, amenityId]
        );
    };

    const handleContinue = () => {
        updateDraft({ amenities: selectedAmenities });
        nextStep();
        navigate('/host/location');
    };

    const handleBack = () => {
        updateDraft({ amenities: selectedAmenities });
        previousStep();
        navigate('/host/intro');
    };

    const categories = ['Essentials', 'Features', 'Safety'];

    return (
        <div className="min-h-screen bg-background p-4 py-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">What your place offers</h1>
                    <p className="text-muted-foreground">
                        You can add more amenities after you publish your listing
                    </p>
                </div>

                {categories.map(category => {
                    const categoryAmenities = amenitiesList.filter(a => a.category === category);
                    return (
                        <div key={category} className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">{category}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categoryAmenities.map(amenity => {
                                    const Icon = amenity.icon;
                                    const isSelected = selectedAmenities.includes(amenity.id);
                                    return (
                                        <button
                                            key={amenity.id}
                                            onClick={() => toggleAmenity(amenity.id)}
                                            className={`p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <span className="font-medium">{amenity.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                <div className="flex justify-between items-center mt-12 pt-6 border-t">
                    <Button variant="outline" onClick={handleBack}>
                        Back
                    </Button>
                    <Button
                        onClick={handleContinue}
                        disabled={selectedAmenities.length === 0}
                        size="lg"
                    >
                        Continue
                    </Button>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                    Step 2 of 10
                </div>
            </div>
        </div>
    );
};

export default Amenities;
