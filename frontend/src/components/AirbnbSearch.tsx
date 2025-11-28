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
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const AirbnbSearch = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [where, setWhere] = useState("");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<"dates" | "months" | "flexible">("dates");
    const [monthsCount, setMonthsCount] = useState(2);
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
        if (date) params.set("date", date.toISOString());
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
        { name: "À proximité", desc: "Découvrez les options à proximité", icon: "🧭" },
        { name: "Centre-ville de Montréal, Canada", desc: "Célèbre pour des sites comme : Basilique Notre-Dame de Montréal", icon: "🏛️" },
        { name: "Abidjan", desc: "Pour un voyage à l'étranger", icon: "🏖️" },
        { name: "Paris, Île-de-France", desc: "Parce que vous avez enregistré des logements en favoris pour cette destination : Paris", icon: "🗼" },
        { name: "Douala, Cameroun", desc: "Pour un voyage à l'étranger", icon: "🏙️" },
        { name: "Dakar, Sénégal", desc: "Une perle rare", icon: "🌊" },
        { name: "Marrakech, Maroc", desc: "Célèbre pour des sites comme :", icon: "🕌" },
    ];

    return (
        <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto relative z-50">
            <div className="flex items-center bg-white rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 relative">
                {/* Where */}
                <Popover open={openWhere} onOpenChange={setOpenWhere}>
                    <PopoverTrigger asChild>
                        <div className={`flex-1 px-6 py-3 cursor-pointer hover:bg-gray-100 rounded-full transition-colors ${openWhere ? 'bg-gray-100' : ''}`}>
                            <label className="block text-xs font-bold text-gray-900 mb-1">
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
                            <h3 className="text-xs font-bold text-gray-500 mb-4 px-2">Suggestions de destinations</h3>
                            <div className="space-y-1">
                                {suggestions.map((item) => (
                                    <div
                                        key={item.name}
                                        className="flex items-center gap-4 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                                        onClick={() => {
                                            setWhere(item.name);
                                            setOpenWhere(false);
                                            setOpenWhen(true);
                                        }}
                                    >
                                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
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

                <div className="h-8 w-px bg-gray-300" />

                {/* When */}
                <Popover open={openWhen} onOpenChange={setOpenWhen}>
                    <PopoverTrigger asChild>
                        <div className={`flex-1 px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors ${openWhen ? 'bg-gray-100 rounded-full' : ''}`}>
                            <label className="block text-xs font-bold text-gray-900 mb-1">
                                {t("when")}
                            </label>
                            <div className="text-sm text-gray-900 font-medium truncate">
                                {date ? format(date, "MMM dd, yyyy") : <span className="text-gray-500 font-normal">{t("add dates")}</span>}
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
                                        mode="single"
                                        selected={date}
                                        onSelect={(newDate) => {
                                            setDate(newDate);
                                            if (newDate) {
                                                setOpenWhen(false);
                                                setOpenWho(true);
                                            }
                                        }}
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
                                        <span className="font-semibold text-gray-900">Dec 1, 2025</span>
                                        <span className="mx-2">to</span>
                                        <span className="font-semibold text-gray-900">Feb 1, 2026</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === "flexible" && (
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <h3 className="text-lg font-semibold mb-4">How long would you like to stay?</h3>
                                        <div className="flex justify-center gap-3">
                                            {["Weekend", "Week", "Month"].map((option) => (
                                                <button
                                                    key={option}
                                                    className="px-6 py-2 rounded-full border border-gray-300 hover:border-black text-sm font-medium transition-colors focus:border-black focus:bg-gray-50"
                                                >
                                                    {option}
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
                                                <div key={month} className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:border-black cursor-pointer transition-all bg-white hover:bg-gray-50">
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

                <div className="h-8 w-px bg-gray-300" />

                {/* Who */}
                <Popover open={openWho} onOpenChange={setOpenWho}>
                    <PopoverTrigger asChild>
                        <div className={`flex-1 px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors ${openWho ? 'bg-gray-100 rounded-full' : ''}`}>
                            <label className="block text-xs font-bold text-gray-900 mb-1">
                                {t("who")}
                            </label>
                            <div className="text-sm text-gray-900 font-medium truncate">
                                {guests.adults + guests.children > 0
                                    ? `${guests.adults + guests.children} guests`
                                    : <span className="text-gray-500 font-normal">{t("add guests")}</span>}
                            </div>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-6 rounded-3xl shadow-xl border-0 mt-4" align="end">
                        <div className="space-y-6">
                            {[
                                { type: "adults", label: "Adultes", sub: "13 ans et plus" },
                                { type: "children", label: "Enfants", sub: "De 2 à 12 ans" },
                                { type: "infants", label: "Bébés", sub: "- de 2 ans" },
                                { type: "pets", label: "Animaux domestiques", sub: "Vous voyagez avec un animal d'assistance ?" },
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
                        className="h-12 w-12 rounded-full bg-primary hover:bg-primary-dark transition-colors shadow-none"
                    >
                        <Search className="h-5 w-5 text-white" />
                    </Button>
                </div>
            </div>
        </form>
    );
};

export default AirbnbSearch;
