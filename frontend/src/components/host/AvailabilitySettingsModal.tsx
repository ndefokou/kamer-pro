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
    const [advanceNoticeDays, setAdvanceNoticeDays] = useState(
        settings.advance_notice === 'same_day' ? 0 : parseInt(settings.advance_notice.split('_')[0]) || 1
    );
    const [cutoffTime, setCutoffTime] = useState(settings.same_day_cutoff_time || '12:00');
    const [prepTime, setPrepTime] = useState(settings.preparation_time);
    const [availWindow, setAvailWindow] = useState(settings.availability_window);

    const handleSave = () => {
        const advanceNotice = advanceNoticeDays === 0 ? 'same_day' : `${advanceNoticeDays}_day${advanceNoticeDays > 1 ? 's' : ''}`;
        onSave({
            min_nights: minNights,
            max_nights: maxNights,
            advance_notice: advanceNotice,
            same_day_cutoff_time: cutoffTime,
            preparation_time: prepTime,
            availability_window: availWindow,
        });
    };

    // Generate time options (00:00 to 23:00)
    const timeOptions = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0');
        return `${hour}:00`;
    });

    return (
        <div className="bg-white h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-6 flex items-center justify-between border-b border-gray-200">
                <h2 className="text-xl font-semibold">Availability</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8 pt-6">
                {/* Trip Length */}
                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Trip length</h3>

                    <div className="space-y-4">
                        <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                            <label className="block text-sm text-gray-600 mb-2">Minimum nights</label>
                            <Input
                                type="number"
                                value={minNights}
                                onChange={(e) => setMinNights(Number(e.target.value))}
                                className="text-3xl font-semibold border-none bg-transparent p-0 h-auto w-20 focus-visible:ring-0"
                                min={1}
                            />
                        </div>

                        <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
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
                </div>

                {/* Advance Notice */}
                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Advance notice</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        How much notice do you need between a guest's booking and their arrival?
                    </p>

                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors mb-4">
                        <label className="block text-sm text-gray-600 mb-3">Days</label>
                        <div className="relative">
                            <select
                                value={advanceNoticeDays}
                                onChange={(e) => setAdvanceNoticeDays(Number(e.target.value))}
                                className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                            >
                                <option value={0}>Same day</option>
                                <option value={1}>1 day</option>
                                <option value={2}>2 days</option>
                                <option value={3}>3 days</option>
                                <option value={4}>4 days</option>
                                <option value={5}>5 days</option>
                                <option value={6}>6 days</option>
                                <option value={7}>7 days</option>
                            </select>
                            <ChevronDown className="h-5 w-5 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                        <label className="block text-sm text-gray-600 mb-3">Time</label>
                        <div className="relative">
                            <select
                                value={cutoffTime}
                                onChange={(e) => setCutoffTime(e.target.value)}
                                className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                            >
                                {timeOptions.map((time) => (
                                    <option key={time} value={time}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="h-5 w-5 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                            Guests can book on the same day as check-in until this time.
                        </p>
                    </div>
                </div>

                {/* Preparation Time */}
                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Preparation time</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Block time before and after each reservation to prepare your space.
                    </p>

                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                        <div className="relative">
                            <select
                                value={prepTime}
                                onChange={(e) => setPrepTime(e.target.value)}
                                className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                            >
                                <option value="none">None</option>
                                <option value="1_night">1 night before and after each reservation</option>
                                <option value="2_nights">2 nights before and after each reservation</option>
                            </select>
                            <ChevronDown className="h-5 w-5 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Availability Window */}
                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Availability window</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        How far in advance can guests book?
                    </p>

                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                        <div className="relative">
                            <select
                                value={availWindow}
                                onChange={(e) => setAvailWindow(Number(e.target.value))}
                                className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none pr-8 cursor-pointer"
                            >
                                <option value={3}>3 months in advance</option>
                                <option value={6}>6 months in advance</option>
                                <option value={9}>9 months in advance</option>
                                <option value={12}>12 months in advance</option>
                                <option value={24}>24 months in advance</option>
                            </select>
                            <ChevronDown className="h-5 w-5 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>
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
