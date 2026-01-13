import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, MapPin, Minus, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const MboaMaissonSearch = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [where, setWhere] = useState("");
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<"dates" | "months" | "flexible">("dates");
    const [monthsCount, setMonthsCount] = useState(2);
    const [monthsStart, setMonthsStart] = useState<Date>(new Date());
    const [flexibleDuration, setFlexibleDuration] = useState<"weekend" | "week" | "month">("weekend");
    const [flexibleMonths, setFlexibleMonths] = useState<string[]>([]);
    const [guests, setGuests] = useState({
        adults: 0,
        children: 0,
        infants: 0,
        pets: 0,
    });

    const [openWhere, setOpenWhere] = useState(false);
    const [openWhen, setOpenWhen] = useState(false);
    const [openWho, setOpenWho] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (where.trim()) params.set("search", where.trim());

        if (activeTab === "dates" && date?.from) {
            params.set("checkin", date.from.toISOString());
            if (date.to) params.set("checkout", date.to.toISOString());
        } else if (activeTab === "months") {
            const startDate = monthsStart;
            const endDate = addMonths(monthsStart, monthsCount);
            params.set("checkin", startDate.toISOString());
            params.set("checkout", endDate.toISOString());
            params.set("duration_months", monthsCount.toString());
        } else if (activeTab === "flexible") {
            params.set("flexible_duration", flexibleDuration);
            if (flexibleMonths.length > 0) {
                params.set("flexible_months", flexibleMonths.join(","));
            }
        }

        const totalGuests = guests.adults + guests.children;
        if (totalGuests > 0) params.set("guests", totalGuests.toString());
        navigate(`/marketplace?${params.toString()}`);
    };

    const updateGuest = (type: keyof typeof guests, operation: "add" | "sub") => {
        setGuests((prev) => {
            const newValue = operation === "add" ? prev[type] + 1 : prev[type] - 1;
            return { ...prev, [type]: Math.max(0, newValue) };
        });
    };

    const suggestions = [
        { name: "Yaounde", desc: "Political capital of Cameroon", icon: "🏛️" },
        { name: "Douala", desc: "Economic capital of Cameroon", icon: "🏙️" },
        { name: "Kribi", desc: "Seaside resort", icon: "🏖️" },
    ];

    return (
        <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto relative z-40">
            {/* Mobile Search Trigger */}
            <div className="md:hidden w-full px-4">
                <div className="flex items-center gap-3 bg-white rounded-full shadow-md border border-gray-200 p-3" onClick={() => setOpenWhere(true)}>
                    <Search className="h-5 w-5 text-gray-500 ml-2" />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">Where to?</span>
                        <div className="flex gap-1 text-xs text-gray-500">
                            <span>Anywhere</span>
                            <span>•</span>
                            <span>Any week</span>
                            <span>•</span>
                            <span>Add guests</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex items-center bg-white rounded-full shadow-soft hover:shadow-elevated border border-gray-200 transition-all duration-300 relative">
                {/* Where */}
                <Popover open={openWhere} onOpenChange={setOpenWhere}>
                    <PopoverTrigger asChild>
                        <div className={`flex-1 px-8 py-3.5 cursor-pointer hover:bg-gray-100 rounded-full transition-colors ${openWhere ? 'bg-gray-100 shadow-sm' : ''}`}>
                            <label className="block text-xs font-bold text-gray-900 mb-0.5 uppercase tracking-wider">
                                {t("where")}
                            </label>
                            <input
                                type="text"
                                placeholder={t("search destinations")}
                                value={where}
                                onChange={(e) => setWhere(e.target.value)}
                                className="w-full bg-transparent border-0 p-0 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none truncate font-medium"
                            />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0 rounded-3xl overflow-hidden shadow-xl border-0 mt-4" align="start">
                        <div className="p-4">
                            <h3 className="text-xs font-bold text-gray-500 mb-4 px-2 uppercase tracking-wider">Suggestions</h3>
                            <div className="space-y-1">
                                {suggestions.map((item) => (
                                    <div
                                        key={item.name}
                                        className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                                        onClick={() => {
                                            setWhere(item.name);
                                            setOpenWhere(false);
                                            setOpenWhen(true);
                                        }}
                                    >
                                        <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="h-8 w-px bg-gray-200" />

                {/* When */}
                <Popover open={openWhen} onOpenChange={setOpenWhen}>
                    <PopoverTrigger asChild>
                        <div className={`flex-1 px-8 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors ${openWhen ? 'bg-gray-100 rounded-full shadow-sm' : ''}`}>
                            <label className="block text-xs font-bold text-gray-900 mb-0.5 uppercase tracking-wider">
                                {t("when")}
                            </label>
                            <div className="text-sm text-gray-900 font-medium truncate">
                                {activeTab === "dates" && date?.from ? (
                                    <>
                                        {format(date.from, "MMM dd")}
                                        {date.to ? ` - ${format(date.to, "MMM dd")}` : ""}
                                    </>
                                ) : activeTab === "months" ? (
                                    `${monthsCount} months from ${format(monthsStart, "MMM")}`
                                ) : activeTab === "flexible" ? (
                                    `${flexibleDuration} in ${flexibleMonths.length > 0 ? flexibleMonths.length + " months" : "anytime"}`
                                ) : (
                                    <span className="text-gray-400 font-normal">{t("add dates")}</span>
                                )}
                            </div>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[660px] p-0 rounded-3xl shadow-xl border-0 mt-4 overflow-hidden" align="center">
                        <div className="p-6">
                            <div className="flex justify-center mb-6 bg-gray-100 p-1 rounded-full w-fit mx-auto">
                                <button
                                    onClick={() => setActiveTab("dates")}
                                    className={`px-6 py-1.5 text-sm font-semibold rounded-full transition-all ${activeTab === "dates" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:bg-gray-200"}`}
                                >
                                    Dates
                                </button>
                                <button
                                    onClick={() => setActiveTab("months")}
                                    className={`px-6 py-1.5 text-sm font-semibold rounded-full transition-all ${activeTab === "months" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:bg-gray-200"}`}
                                >
                                    Months
                                </button>
                                <button
                                    onClick={() => setActiveTab("flexible")}
                                    className={`px-6 py-1.5 text-sm font-semibold rounded-full transition-all ${activeTab === "flexible" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:bg-gray-200"}`}
                                >
                                    Flexible
                                </button>
                            </div>

                            {activeTab === "dates" && (
                                <div className="flex justify-center">
                                    <Calendar
                                        mode="range"
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                        className="rounded-md border-0"
                                    />
                                </div>
                            )}

                            {activeTab === "months" && (
                                <div className="flex flex-col items-center py-4">
                                    <h3 className="text-lg font-semibold mb-8">When's your trip?</h3>

                                    {/* Circular Dial Implementation */}
                                    <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                                        {/* Dial Background */}
                                        <div className="absolute inset-0 rounded-full border-[20px] border-gray-100"></div>

                                        {/* Active Arc (Simulated with CSS conic-gradient for simplicity) */}
                                        <div
                                            className="absolute inset-0 rounded-full border-[20px] border-transparent"
                                            style={{
                                                background: `conic-gradient(from 0deg, #ff385c 0%, #ff385c ${monthsCount * 30}deg, transparent ${monthsCount * 30}deg)`,
                                                mask: 'radial-gradient(transparent 60%, black 61%)',
                                                WebkitMask: 'radial-gradient(transparent 60%, black 61%)'
                                            }}
                                        ></div>

                                        {/* Handle (Simulated position) */}
                                        <div
                                            className="absolute w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 cursor-pointer transform -translate-y-1/2"
                                            style={{
                                                top: '15%',
                                                right: '15%',
                                            }}
                                        ></div>

                                        <div className="flex flex-col items-center z-10">
                                            <span className="text-6xl font-bold text-gray-900">{monthsCount}</span>
                                            <span className="text-lg font-medium text-gray-600">months</span>
                                        </div>

                                        {/* Interactive Slider Overlay (Invisible but functional) */}
                                        <input
                                            type="range"
                                            min="1"
                                            max="12"
                                            value={monthsCount}
                                            onChange={(e) => setMonthsCount(parseInt(e.target.value))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>

                                    <div className="text-center border-b-2 border-black pb-1">
                                        <span className="font-semibold text-gray-900">{format(monthsStart, "MMM dd, yyyy")}</span>
                                        <span className="mx-2">to</span>
                                        <span className="font-semibold text-gray-900">{format(addMonths(monthsStart, monthsCount), "MMM dd, yyyy")}</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === "flexible" && (
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <h3 className="text-lg font-semibold mb-4">How long would you like to stay?</h3>
                                        <div className="flex justify-center gap-3">
                                            {["weekend", "week", "month"].map((option) => (
                                                <button
                                                    key={option}
                                                    onClick={() => setFlexibleDuration(option as any)}
                                                    className={`px-6 py-2 rounded-full border text-sm font-medium transition-colors ${flexibleDuration === option ? "border-black bg-gray-50" : "border-gray-300 hover:border-black"}`}
                                                >
                                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <h3 className="text-lg font-semibold mb-4">Go anytime</h3>
                                        <div className="grid grid-cols-6 gap-4 px-2">
                                            {[
                                                "January", "February", "March", "April", "May", "June",
                                                "July", "August", "September", "October", "November", "December"
                                            ].map((month) => (
                                                <div
                                                    key={month}
                                                    onClick={() => {
                                                        setFlexibleMonths(prev =>
                                                            prev.includes(month)
                                                                ? prev.filter(m => m !== month)
                                                                : [...prev, month]
                                                        );
                                                    }}
                                                    className={`flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all ${flexibleMonths.includes(month) ? "border-black bg-gray-50" : "border-gray-200 hover:border-black bg-white hover:bg-gray-50"}`}
                                                >
                                                    <CalendarIcon className="h-8 w-8 mb-2 text-gray-400" />
                                                    <span className="text-sm font-medium">{month}</span>
                                                    <span className="text-xs text-gray-500">2026</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="h-8 w-px bg-gray-200" />

                {/* Who */}
                <Popover open={openWho} onOpenChange={setOpenWho}>
                    <PopoverTrigger asChild>
                        <div className={`flex-1 px-8 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors ${openWho ? 'bg-gray-100 rounded-full shadow-sm' : ''}`}>
                            <label className="block text-xs font-bold text-gray-900 mb-0.5 uppercase tracking-wider">
                                {t("who")}
                            </label>
                            <div className="text-sm text-gray-900 font-medium truncate">
                                {guests.adults + guests.children > 0
                                    ? `${guests.adults + guests.children} guests`
                                    : <span className="text-gray-400 font-normal">{t("add guests")}</span>}
                            </div>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-6 rounded-3xl shadow-xl border-0 mt-4" align="end">
                        <div className="space-y-6">
                            {[
                                { type: "adults", label: "Adults", sub: "Age 13+" },
                                { type: "children", label: "Children", sub: "Ages 2-12" },
                                { type: "infants", label: "Infants", sub: "Under 2" },
                                { type: "pets", label: "Pets", sub: "Traveling with a service animal?" },
                            ].map((item) => (
                                <div key={item.type} className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold text-gray-900">{item.label}</div>
                                        <div className="text-sm text-gray-500">{item.sub}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full border-gray-300 hover:border-black disabled:opacity-20"
                                            onClick={() => updateGuest(item.type as keyof typeof guests, "sub")}
                                            disabled={guests[item.type as keyof typeof guests] === 0}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-4 text-center text-gray-900 font-medium">
                                            {guests[item.type as keyof typeof guests]}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full border-gray-300 hover:border-black"
                                            onClick={() => updateGuest(item.type as keyof typeof guests, "add")}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Search Button */}
                <div className="pr-2">
                    <Button
                        type="submit"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-primary hover:bg-primary-dark transition-all duration-300 shadow-md hover:scale-105"
                    >
                        <Search className="h-5 w-5 text-white stroke-[3px]" />
                    </Button>
                </div>
            </div>
        </form>
    );
};

export default MboaMaissonSearch;
