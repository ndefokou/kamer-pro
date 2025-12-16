import React, { useState, useEffect } from 'react';
import { Minus, Plus, ChevronRight, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HouseRules {
    pets_allowed: boolean;
    events_allowed: boolean;
    smoking_allowed: boolean;
    quiet_hours: boolean;
    commercial_photography_allowed: boolean;
    check_in_start: string;
    check_in_end: string;
    checkout_time: string;
    additional_rules: string;
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
    pets_allowed: false,
    events_allowed: false,
    smoking_allowed: false,
    quiet_hours: false,
    commercial_photography_allowed: false,
    check_in_start: '15:00',
    check_in_end: '20:00',
    checkout_time: '11:00',
    additional_rules: '',
};

interface HouseRulesSectionProps {
    rules: HouseRules;
    maxGuests: number;
    onRulesChange: (newRules: HouseRules) => void;
    onMaxGuestsChange: (newMaxGuests: number) => void;
}

const HouseRulesSection: React.FC<HouseRulesSectionProps> = ({
    rules,
    maxGuests,
    onRulesChange,
    onMaxGuestsChange
}) => {
    const [activeSubView, setActiveSubView] = useState<'main' | 'times' | 'additional'>('main');

    const toggleRule = (key: keyof HouseRules) => {
        onRulesChange({ ...rules, [key]: !rules[key as keyof HouseRules] });
    };

    const timeOptions = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0');
        return `${hour}:00`;
    });

    if (activeSubView === 'times') {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => setActiveSubView('main')}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors mb-2"
                    >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                    </button>
                    <h2 className="text-2xl font-semibold">Check-in and checkout times</h2>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-base font-medium text-gray-900 mb-2">Check-in start</label>
                        <div className="relative">
                            <select
                                value={rules.check_in_start}
                                onChange={(e) => onRulesChange({ ...rules, check_in_start: e.target.value })}
                                className="w-full p-4 bg-white border border-gray-300 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            >
                                {timeOptions.map(time => (
                                    <option key={`start-${time}`} value={time}>{time}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-base font-medium text-gray-900 mb-2">Check-in end</label>
                        <div className="relative">
                            <select
                                value={rules.check_in_end}
                                onChange={(e) => onRulesChange({ ...rules, check_in_end: e.target.value })}
                                className="w-full p-4 bg-white border border-gray-300 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            >
                                {timeOptions.map(time => (
                                    <option key={`end-${time}`} value={time}>{time}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-base font-medium text-gray-900 mb-2">Checkout time</label>
                        <div className="relative">
                            <select
                                value={rules.checkout_time}
                                onChange={(e) => onRulesChange({ ...rules, checkout_time: e.target.value })}
                                className="w-full p-4 bg-white border border-gray-300 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            >
                                {timeOptions.map(time => (
                                    <option key={`out-${time}`} value={time}>{time}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <Button onClick={() => setActiveSubView('main')} className="bg-black text-white rounded-lg px-6 py-3">
                        Save
                    </Button>
                </div>
            </div>
        );
    }

    if (activeSubView === 'additional') {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => setActiveSubView('main')}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors mb-2"
                    >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                    </button>
                    <h2 className="text-2xl font-semibold">Additional rules</h2>
                    <p className="text-gray-500 mt-2">Share anything else you expect from guests.</p>
                </div>

                <textarea
                    value={rules.additional_rules}
                    onChange={(e) => onRulesChange({ ...rules, additional_rules: e.target.value })}
                    className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                    placeholder="e.g. No shoes in the house"
                />

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <Button onClick={() => setActiveSubView('main')} className="bg-black text-white rounded-lg px-6 py-3">
                        Save
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-2">House rules</h2>
                <p className="text-gray-500">
                    Guests are expected to follow your rules and may be removed from mboaMaisson if they don't.
                </p>
            </div>

            <div className="space-y-6">
                {/* Toggles */}
                {[
                    { key: 'pets_allowed', label: 'Pets allowed', sub: 'You can refuse pets, but must reasonably accommodate service animals.' },
                    { key: 'events_allowed', label: 'Events allowed' },
                    { key: 'smoking_allowed', label: 'Smoking, vaping, e-cigarettes allowed' },
                    { key: 'quiet_hours', label: 'Quiet hours' },
                    { key: 'commercial_photography_allowed', label: 'Commercial photography and filming allowed' },
                ].map(({ key, label, sub }) => (
                    <div key={key} className="flex items-center justify-between py-4 border-b border-gray-100">
                        <div className="pr-4">
                            <div className="text-base font-medium text-gray-900">{label}</div>
                            {sub && <div className="text-sm text-gray-500 mt-1">{sub}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                            {rules[key as keyof HouseRules] ? (
                                <>
                                    <button
                                        onClick={() => toggleRule(key as keyof HouseRules)}
                                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                    >
                                        <X className="h-4 w-4 text-gray-600" />
                                    </button>
                                    <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white">
                                        <div className="h-2 w-3 border-b-2 border-l-2 border-white -rotate-45 mb-0.5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                                        <X className="h-4 w-4 text-white" />
                                    </button>
                                    <button
                                        onClick={() => toggleRule(key as keyof HouseRules)}
                                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                    >
                                        <div className="h-2 w-3 border-b-2 border-l-2 border-gray-400 -rotate-45 mb-0.5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {/* Guest Count */}
                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                    <div className="text-base font-medium text-gray-900">Number of guests</div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onMaxGuestsChange(Math.max(1, maxGuests - 1))}
                            disabled={maxGuests <= 1}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${maxGuests <= 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-400 text-gray-600 hover:border-black hover:text-black'
                                }`}
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-base font-medium w-4 text-center">{maxGuests}</span>
                        <button
                            onClick={() => onMaxGuestsChange(maxGuests + 1)}
                            className="w-8 h-8 rounded-full border border-gray-400 text-gray-600 flex items-center justify-center hover:border-black hover:text-black transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-pages Links */}
                <button
                    onClick={() => setActiveSubView('times')}
                    className="w-full flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                    <span className="text-base font-medium text-gray-900">Check-in and checkout times</span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>

                <button
                    onClick={() => setActiveSubView('additional')}
                    className="w-full flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="pr-4">
                        <div className="text-base font-medium text-gray-900">Additional rules</div>
                        <div className="text-sm text-gray-500 mt-1">Share anything else you expect from guests.</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
            </div>
        </div>
    );
};

export default HouseRulesSection;
