import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AMENITY_CATEGORIES, AMENITY_DETAILS, getAllAmenities, AmenityCategory } from '@/data/amenities';

interface AddAmenitiesPanelProps {
    selectedAmenities: string[];
    onToggle: (amenityId: string) => void;
    onClose: () => void;
}

const AddAmenitiesPanel: React.FC<AddAmenitiesPanelProps> = ({ selectedAmenities, onToggle, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<AmenityCategory | 'All'>('All');

    const filteredAmenities = useMemo(() => {
        let amenities = getAllAmenities();

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            amenities = amenities.filter(a =>
                a.label.toLowerCase().includes(query) ||
                a.description.toLowerCase().includes(query)
            );
        }
        // Filter by category if no search query and category is not All
        else if (activeCategory !== 'All') {
            amenities = amenities.filter(a => a.category === activeCategory);
        }

        return amenities;
    }, [searchQuery, activeCategory]);

    // Group by category for display when showing "All" or search results
    const groupedAmenities = useMemo(() => {
        const groups: Record<string, typeof filteredAmenities> = {};

        filteredAmenities.forEach(amenity => {
            if (!groups[amenity.category]) {
                groups[amenity.category] = [];
            }
            groups[amenity.category].push(amenity);
        });

        // Sort categories based on predefined order
        const sortedGroups: { category: string; amenities: typeof filteredAmenities }[] = [];
        AMENITY_CATEGORIES.forEach(cat => {
            if (groups[cat]) {
                sortedGroups.push({ category: cat, amenities: groups[cat] });
            }
        });

        return sortedGroups;
    }, [filteredAmenities]);

    return (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <h2 className="text-lg font-semibold">Add amenities</h2>
                    <div className="w-9" /> {/* Spacer for centering */}
                </div>

                {/* Categories & Search */}
                <div className="px-6 py-4 border-b border-gray-200 space-y-4">
                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-6 px-6">
                        <button
                            onClick={() => setActiveCategory('All')}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${activeCategory === 'All'
                                    ? 'border-black bg-black text-white'
                                    : 'border-gray-200 hover:border-black bg-white text-gray-700'
                                }`}
                        >
                            All
                        </button>
                        {AMENITY_CATEGORIES.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${activeCategory === category
                                        ? 'border-black bg-black text-white'
                                        : 'border-gray-200 hover:border-black bg-white text-gray-700'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search amenities"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent focus:bg-white focus:border-black focus:ring-0 rounded-full transition-all font-medium"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {groupedAmenities.length > 0 ? (
                        <div className="space-y-8">
                            {groupedAmenities.map(({ category, amenities }) => (
                                <div key={category}>
                                    <h3 className="text-lg font-semibold mb-4">{category}</h3>
                                    <div className="space-y-4">
                                        {amenities.map(amenity => {
                                            const isSelected = selectedAmenities.includes(amenity.id);
                                            const Icon = amenity.icon;
                                            return (
                                                <div key={amenity.id} className="flex items-center justify-between group">
                                                    <div className="flex items-start gap-4 pr-4">
                                                        <div className="mt-1">
                                                            <Icon className="h-6 w-6 text-gray-500" />
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-medium text-gray-900">{amenity.label}</div>
                                                            <div className="text-sm text-gray-500">{amenity.description}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => onToggle(amenity.id)}
                                                        className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isSelected
                                                                ? 'bg-black border-black text-white'
                                                                : 'border-gray-300 hover:border-black text-gray-600'
                                                            }`}
                                                    >
                                                        {isSelected ? (
                                                            <Check className="h-4 w-4" />
                                                        ) : (
                                                            <Plus className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            No amenities found matching "{searchQuery}"
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-white">
                    <Button
                        onClick={onClose}
                        className="w-full bg-black text-white hover:bg-gray-800 py-6 text-lg rounded-xl"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddAmenitiesPanel;
