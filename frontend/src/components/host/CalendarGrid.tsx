import React from 'react';

interface CalendarPricing {
    id: number;
    listing_id: string;
    date: string;
    price: number;
    is_available: boolean;
}

interface CalendarGridProps {
    month: Date;
    pricingData: Map<string, CalendarPricing>;
    selectedDates: string[];
    onDateSelect: (date: string) => void;
    basePrice: number;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
    month,
    pricingData,
    selectedDates,
    onDateSelect,
    basePrice,
}) => {
    const getDaysInMonth = () => {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Add empty cells for days before the first of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, monthIndex, day));
        }

        return days;
    };

    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const getPrice = (date: Date): number => {
        const dateStr = formatDate(date);
        const pricing = pricingData.get(dateStr);
        return pricing?.price || basePrice;
    };

    const isAvailable = (date: Date): boolean => {
        const dateStr = formatDate(date);
        const pricing = pricingData.get(dateStr);
        return pricing?.is_available !== false;
    };

    const isSelected = (date: Date): boolean => {
        const dateStr = formatDate(date);
        return selectedDates.includes(dateStr);
    };

    const isPast = (date: Date): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const days = getDaysInMonth();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
                {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-[10px] uppercase font-semibold text-gray-400 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                    if (!date) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dateStr = formatDate(date);
                    const price = getPrice(date);
                    const available = isAvailable(date);
                    const selected = isSelected(date);
                    const past = isPast(date);

                    return (
                        <button
                            key={dateStr}
                            onClick={() => !past && onDateSelect(dateStr)}
                            disabled={past}
                            className={`
                                aspect-square p-1 sm:p-2 text-left transition-all relative rounded-xl border flex flex-col justify-between overflow-hidden
                                ${!past && 'hover:border-black hover:shadow-sm cursor-pointer'}
                                ${past ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50' : ''}
                                ${selected
                                    ? 'border-2 border-black bg-gray-900 text-white z-10'
                                    : 'border-gray-200 bg-white'
                                }
                                ${!available && !past && !selected ? 'bg-gray-50 border-gray-200' : ''}
                            `}
                        >
                            <span className={`text-xs font-medium ${selected ? 'text-white' : past ? 'text-gray-400' : 'text-gray-900'}`}>
                                {date.getDate()}
                            </span>
                            {!past && (
                                <div className="flex flex-col items-center justify-center flex-1 w-full">
                                    <span className={`text-[10px] sm:text-xs font-medium truncate w-full text-center ${selected ? 'text-white' : available ? 'text-gray-700' : 'text-gray-400 line-through'
                                        }`}>
                                        ${price}
                                    </span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarGrid;
