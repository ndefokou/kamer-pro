import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SAFETY_CONSIDERATIONS, SAFETY_DEVICES, PROPERTY_INFO, SafetyItem } from '@/data/guestSafety';

interface GuestSafetyModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: string[];
    onSave: (items: string[]) => void;
    initialSection?: 'considerations' | 'devices' | 'property_info';
}

const GuestSafetyModal: React.FC<GuestSafetyModalProps> = ({
    isOpen,
    onClose,
    selectedItems,
    onSave,
    initialSection = 'considerations'
}) => {
    const [activeSection, setActiveSection] = useState<'considerations' | 'devices' | 'property_info' | null>(initialSection);
    const [tempSelected, setTempSelected] = useState<string[]>(selectedItems);

    if (!isOpen) return null;

    const toggleItem = (itemId: string) => {
        setTempSelected(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const handleSave = () => {
        onSave(tempSelected);
        onClose();
    };

    const handleCancel = () => {
        setTempSelected(selectedItems);
        onClose();
    };

    const renderMainView = () => (
        <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <button
                    onClick={handleCancel}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold">Guest safety</h2>
                <div className="w-9" />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <p className="text-sm text-gray-600 mb-6">
                    The safety devices and considerations you share with guests help them make informed decisions when booking your property.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => setActiveSection('considerations')}
                        className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between"
                    >
                        <div>
                            <div className="font-medium text-gray-900 mb-1">Safety considerations</div>
                            <div className="text-sm text-gray-500">Add details</div>
                        </div>
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setActiveSection('devices')}
                        className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between"
                    >
                        <div>
                            <div className="font-medium text-gray-900 mb-1">Safety devices</div>
                            <div className="text-sm text-gray-500">
                                {tempSelected.filter(id => SAFETY_DEVICES.some(d => d.id === id)).length > 0
                                    ? `${tempSelected.filter(id => SAFETY_DEVICES.some(d => d.id === id)).length} selected`
                                    : 'Noise decibel monitor present'}
                            </div>
                        </div>
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setActiveSection('property_info')}
                        className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between"
                    >
                        <div>
                            <div className="font-medium text-gray-900 mb-1">Property info</div>
                            <div className="text-sm text-gray-500">Add details</div>
                        </div>
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </>
    );

    const renderSectionView = (items: SafetyItem[], title: string) => (
        <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveSection(null)}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold">{title}</h2>
                <div className="w-9" />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                    {items.map((item) => {
                        const isSelected = tempSelected.includes(item.id);
                        return (
                            <div key={item.id} className="border-b border-gray-100 pb-6 last:border-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900 mb-2">{item.label}</h3>
                                        <p className="text-sm text-gray-600 whitespace-pre-line">{item.description}</p>
                                        {item.learnMoreUrl && (
                                            <button className="text-sm font-medium underline mt-2">Learn more</button>
                                        )}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => toggleItem(item.id)}
                                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${!isSelected
                                                    ? 'bg-black border-black text-white'
                                                    : 'border-gray-300 hover:border-black text-gray-600'
                                                }`}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => toggleItem(item.id)}
                                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                    ? 'bg-black border-black text-white'
                                                    : 'border-gray-300 hover:border-black text-gray-600'
                                                }`}
                                        >
                                            <Check className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                <button
                    onClick={handleCancel}
                    className="text-base font-medium text-gray-900 hover:underline"
                >
                    Cancel
                </button>
                <Button
                    onClick={handleSave}
                    className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6"
                >
                    Save
                </Button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {activeSection === null && renderMainView()}
                {activeSection === 'considerations' && renderSectionView(SAFETY_CONSIDERATIONS, 'Safety considerations')}
                {activeSection === 'devices' && renderSectionView(SAFETY_DEVICES, 'Safety devices')}
                {activeSection === 'property_info' && renderSectionView(PROPERTY_INFO, 'Property info')}
            </div>
        </div>
    );
};

export default GuestSafetyModal;
