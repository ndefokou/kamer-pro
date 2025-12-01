import React from 'react';

interface CalendarPricing {
    id: number;
    listing_id: string;
    date: string;
    price: number;
    is_available: number;
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
        return pricing?.is_available !== 0;
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
            <h3 className="text-2xl font-semibold mb-4">
                {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-4 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-4">
                {days.map((date, index) => {
                    if (!date) {
                        return <div key={`empty-${index}`} className="h-28" />;
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
                                h-28 p-3 text-left transition-all relative rounded-2xl border flex flex-col justify-between
                                ${!past && 'hover:border-gray-900 cursor-pointer'}
                                ${past ? 'opacity-40 cursor-not-allowed border-gray-100' : ''}
                                ${selected
                                    ? 'border-2 border-gray-900 bg-white z-10'
                                    : 'border-gray-200 bg-white'
                                }
                                ${!available && !past && !selected ? 'bg-gray-100 border-gray-200' : ''}
                            `}
                        >
                            <span className={`text-sm font-medium ${past ? 'text-gray-400' : 'text-gray-900'}`}>
                                {date.getDate()}
                            </span>
                            {!past && (
                                <span className={`text-sm ${available ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                                    ${price}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarGrid;
