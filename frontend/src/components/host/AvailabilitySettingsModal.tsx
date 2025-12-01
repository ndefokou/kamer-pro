import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ListingSettings {
    min_nights: number;
    max_nights: number;
    advance_notice: string;
    same_day_cutoff_time: string;
    preparation_time: string;
    availability_window: number;
}

interface AvailabilitySettingsModalProps {
    settings: ListingSettings;
    onClose: () => void;
    onSave: (settings: Partial<ListingSettings>) => void;
}

const AvailabilitySettingsModal: React.FC<AvailabilitySettingsModalProps> = ({ settings, onClose, onSave }) => {
    const [minNights, setMinNights] = useState(settings.min_nights);
    const [maxNights, setMaxNights] = useState(settings.max_nights);
    const [advanceNotice, setAdvanceNotice] = useState(settings.advance_notice);
    const [cutoffTime, setCutoffTime] = useState(settings.same_day_cutoff_time);
    const [prepTime, setPrepTime] = useState(settings.preparation_time);
    const [availWindow, setAvailWindow] = useState(settings.availability_window);

    const handleSave = () => {
        onSave({
            min_nights: minNights,
            max_nights: maxNights,
            advance_notice: advanceNotice,
            same_day_cutoff_time: cutoffTime,
            preparation_time: prepTime,
            availability_window: availWindow,
        });
    };

    return (
        <div className="bg-white h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Availability settings</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
                <p className="text-sm text-gray-600">
                    These apply to all nights, unless you customize them by date.
                </p>

                {/* Trip Length */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Trip length</h3>

                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <label className="block text-sm text-gray-600 mb-2">Minimum nights</label>
                        <Input
                            type="number"
                            value={minNights}
                            onChange={(e) => setMinNights(Number(e.target.value))}
                            className="text-3xl font-semibold border-none bg-transparent p-0 h-auto w-20 focus-visible:ring-0"
                            min={1}
                        />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-sm text-gray-600 mb-2">Maximum nights</label>
                        <Input
                            type="number"
                            value={maxNights}
                            onChange={(e) => setMaxNights(Number(e.target.value))}
                            className="text-3xl font-semibold border-none bg-transparent p-0 h-auto w-24 focus-visible:ring-0"
                            min={1}
                        />
                    </div>
                </div>

                {/* Availability */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Availability</h3>

                    {/* Advance Notice */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <label className="block text-sm text-gray-600 mb-2">Advance notice</label>
                        <div className="flex items-center justify-between">
                            <select
                                value={advanceNotice}
                                onChange={(e) => setAdvanceNotice(e.target.value)}
                                className="text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                            >
                                <option value="same_day">Same day</option>
                                <option value="1_day">At least 1 day</option>
                                <option value="2_days">At least 2 days</option>
                                <option value="3_days">At least 3 days</option>
                                <option value="7_days">At least 7 days</option>
                            </select>
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Same Day Advance Notice */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <label className="block text-sm text-gray-600 mb-2">Same day advance notice</label>
                        <div className="flex items-center justify-between">
                            <Input
                                type="time"
                                value={cutoffTime}
                                onChange={(e) => setCutoffTime(e.target.value)}
                                className="text-base font-medium bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                            />
                        </div>
                    </div>

                    {/* Preparation Time */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <label className="block text-sm text-gray-600 mb-2">Preparation time</label>
                        <div className="flex items-center justify-between">
                            <select
                                value={prepTime}
                                onChange={(e) => setPrepTime(e.target.value)}
                                className="text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                            >
                                <option value="none">None</option>
                                <option value="1_night">1 night before and after each reservation</option>
                                <option value="2_nights">2 nights before and after each reservation</option>
                            </select>
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Availability Window */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-sm text-gray-600 mb-2">Availability window</label>
                        <div className="flex items-center justify-between">
                            <select
                                value={availWindow}
                                onChange={(e) => setAvailWindow(Number(e.target.value))}
                                className="text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                            >
                                <option value={3}>3 months in advance</option>
                                <option value={6}>6 months in advance</option>
                                <option value={9}>9 months in advance</option>
                                <option value={12}>12 months in advance</option>
                                <option value={24}>24 months in advance</option>
                            </select>
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* More Availability Settings */}
                <button className="w-full bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                    <div className="text-left">
                        <p className="font-medium text-gray-900">More availability settings</p>
                        <p className="text-sm text-gray-600">Restrict check-in and checkout days</p>
                    </div>
                    <span className="text-gray-400">›</span>
                </button>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
                <Button onClick={handleSave} className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold">
                    Save
                </Button>
            </div>
        </div>
    );
};

export default AvailabilitySettingsModal;
