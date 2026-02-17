import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AMENITY_DETAILS, AMENITY_CATEGORIES } from '@/data/amenities';
import TranslatedText from './TranslatedText';

interface AmenitiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    amenities: string[];
}

const AmenitiesModal: React.FC<AmenitiesModalProps> = ({ isOpen, onClose, amenities }) => {
    const { t } = useTranslation();

    // Group the amenities of this listing by category
    const groupedAmenities = AMENITY_CATEGORIES.map(category => {
        const categoryAmenities = amenities
            .map(key => AMENITY_DETAILS[key])
            .filter(amenity => amenity && amenity.category === category);

        return {
            category,
            items: categoryAmenities
        };
    }).filter(group => group.items.length > 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4 mb-6">
                    <DialogTitle className="text-2xl font-bold">
                        {t('listing.details.offers', { defaultValue: 'What this place offers' })}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-10">
                    {groupedAmenities.map((group) => (
                        <div key={group.category}>
                            <h3 className="text-lg font-semibold mb-4">
                                {t(`amenities.categories.${group.category}`, { defaultValue: group.category })}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {group.items.map((amenity) => {
                                    const Icon = amenity.icon;
                                    return (
                                        <div key={amenity.id} className="flex gap-4">
                                            <div className="pt-1">
                                                <Icon className="h-6 w-6 text-gray-700" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {t(`amenities.${amenity.id}`, { defaultValue: amenity.label })}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {t(`amenities.descriptions.${amenity.id}`, { defaultValue: amenity.description })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AmenitiesModal;
