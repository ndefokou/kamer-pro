import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface ListingSettings {
    base_price?: number;
    weekend_price?: number;
    smart_pricing_enabled: number;
    weekly_discount: number;
    monthly_discount: number;
}

interface PriceSettingsModalProps {
    settings: ListingSettings;
    onClose: () => void;
    onSave: (settings: Partial<ListingSettings>) => void;
}

const PriceSettingsModal: React.FC<PriceSettingsModalProps> = ({ settings, onClose, onSave }) => {
    const [basePrice, setBasePrice] = useState(settings.base_price || 0);
    const [weekendPrice, setWeekendPrice] = useState(settings.weekend_price || 0);
    const [hasWeekendPrice, setHasWeekendPrice] = useState(!!settings.weekend_price);
    const [smartPricing, setSmartPricing] = useState(settings.smart_pricing_enabled === 1);
    const [weeklyDiscount, setWeeklyDiscount] = useState(settings.weekly_discount || 0);
    const [monthlyDiscount, setMonthlyDiscount] = useState(settings.monthly_discount || 0);

    const handleSave = () => {
        onSave({
            base_price: basePrice,
            weekend_price: hasWeekendPrice ? weekendPrice : undefined,
            smart_pricing_enabled: smartPricing ? 1 : 0,
            weekly_discount: weeklyDiscount,
            monthly_discount: monthlyDiscount,
        });
    };

    const weeklyAverage = Math.round(basePrice * (1 - weeklyDiscount / 100));
    const monthlyAverage = Math.round(basePrice * (1 - monthlyDiscount / 100));

    return (
        <div className="bg-white h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Price settings</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
                <p className="text-sm text-gray-600">
                    These apply to all nights, unless you customize them by date.
                </p>

                {/* Base Price */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Base price</h3>
                        <span className="text-sm text-gray-600">FCFA</span>
                    </div>
                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                        <label className="block text-sm text-gray-600 mb-2">Per night</label>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-semibold">FCFA</span>
                            <input
                                type="number"
                                value={basePrice === 0 ? '' : basePrice}
                                onChange={(e) => setBasePrice(Number(e.target.value))}
                                className="text-3xl font-semibold border-none bg-transparent p-0 w-28 focus:outline-none focus:ring-0"
                            />
                        </div>
                    </div>
                </div>

                {/* Custom Weekend Price */}
                {hasWeekendPrice ? (
                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm text-gray-600">Custom weekend price</label>
                            <button
                                onClick={() => setHasWeekendPrice(false)}
                                className="text-sm font-semibold underline hover:text-gray-600"
                            >
                                Remove
                            </button>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-semibold">FCFA</span>
                            <input
                                type="number"
                                value={weekendPrice === 0 ? '' : weekendPrice}
                                onChange={(e) => setWeekendPrice(Number(e.target.value))}
                                className="text-3xl font-semibold border-none bg-transparent p-0 w-28 focus:outline-none focus:ring-0"
                            />
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            setHasWeekendPrice(true);
                            setWeekendPrice(basePrice);
                        }}
                        className="w-full border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors text-left"
                    >
                        <span className="text-sm font-semibold">Add custom weekend price</span>
                    </button>
                )}

                {/* Smart Pricing */}
                <div className="border border-gray-300 rounded-xl p-4 flex items-center justify-between hover:border-gray-900 transition-colors">
                    <div>
                        <p className="font-semibold text-sm">Smart Pricing</p>
                        <p className="text-xs text-gray-600">Automatically adjust prices</p>
                    </div>
                    <Switch checked={smartPricing} onCheckedChange={setSmartPricing} />
                </div>

                {/* Discounts */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Discounts</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Adjust your pricing to attract more guests.
                    </p>

                    {/* Weekly Discount */}
                    <div className="border border-gray-300 rounded-xl p-4 mb-3 hover:border-gray-900 transition-colors">
                        <div className="mb-3">
                            <p className="font-semibold text-sm mb-1">Weekly</p>
                            <p className="text-xs text-gray-600">For 7 nights or more</p>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <input
                                type="number"
                                value={weeklyDiscount === 0 ? '' : weeklyDiscount}
                                onChange={(e) => setWeeklyDiscount(Number(e.target.value))}
                                className="text-3xl font-semibold border-none bg-transparent p-0 w-20 focus:outline-none focus:ring-0"
                                min="0"
                                max="100"
                            />
                            <span className="text-3xl font-semibold">%</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Weekly average is {weeklyAverage} FCFA
                        </p>
                    </div>

                    {/* Monthly Discount */}
                    <div className="border border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors">
                        <div className="mb-3">
                            <p className="font-semibold text-sm mb-1">Monthly</p>
                            <p className="text-xs text-gray-600">For 28 nights or more</p>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <input
                                type="number"
                                value={monthlyDiscount === 0 ? '' : monthlyDiscount}
                                onChange={(e) => setMonthlyDiscount(Number(e.target.value))}
                                className="text-3xl font-semibold border-none bg-transparent p-0 w-20 focus:outline-none focus:ring-0"
                                min="0"
                                max="100"
                            />
                            <span className="text-3xl font-semibold">%</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Monthly average is {monthlyAverage} FCFA
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
                <Button
                    onClick={handleSave}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold"
                >
                    Save
                </Button>
            </div>
        </div>
    );
};

export default PriceSettingsModal;
