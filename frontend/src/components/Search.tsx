import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Minus, Plus, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
type FlexibleDuration = 'weekend' | 'week' | 'month';
const FLEXIBLE_OPTIONS = ['weekend', 'week', 'month'] as const;

const MbokoSearch = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [where, setWhere] = useState("");
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<"dates" | "months" | "flexible">("dates");
    const [flexibleDuration, setFlexibleDuration] = useState<FlexibleDuration>("weekend");
    const [flexibleMonths, setFlexibleMonths] = useState<string[]>([]);
    const [guests, setGuests] = useState({
        adults: 0,
        children: 0,
        infants: 0,
        pets: 0,
    });

    const [openWhere, setOpenWhere] = useState(false);
    const [openWhen, setOpenWhen] = useState(false);
    const [placeTab, setPlaceTab] = useState<"destination" | "nearby">("destination");
    const [dateTolerance, setDateTolerance] = useState<0 | 1 | 2 | 3>(0);
    const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false);
    const [whenStep, setWhenStep] = useState<"dates" | "guests">("dates");

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const m = window.matchMedia('(max-width: 640px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        try { m.addEventListener('change', handler); } catch { m.addListener(handler); }
        return () => { try { m.removeEventListener('change', handler); } catch { m.removeListener(handler); } };
    }, []);

    const runSearch = () => {
        const params = new URLSearchParams();
        if (where.trim()) params.set("search", where.trim());

        if (activeTab === "dates" && date?.from) {
            params.set("checkin", date.from.toISOString());
            if (date.to) params.set("checkout", date.to.toISOString());
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch();
    };

    const updateGuest = (type: keyof typeof guests, operation: "add" | "sub") => {
        setGuests((prev) => {
            const newValue = operation === "add" ? prev[type] + 1 : prev[type] - 1;
            return { ...prev, [type]: Math.max(0, newValue) };
        });
    };

    const suggestions = [
        { name: "Centre", desc: "Region • Yaounde and surroundings", icon: "📍" },
        { name: "Littoral", desc: "Region • Douala and surroundings", icon: "🌊" },
        { name: "South", desc: "Region • Kribi, Ebolowa", icon: "🌴" },
        { name: "Southwest", desc: "Region • Buea, Limbe, Tiko", icon: "🌋" },
        { name: "Northwest", desc: "Region • Bamenda", icon: "⛰️" },
        { name: "West", desc: "Region • Bafoussam, Dschang", icon: "🏞️" },
        { name: "Adamawa", desc: "Region • Ngaoundere", icon: "🐄" },
        { name: "North", desc: "Region • Garoua", icon: "🌾" },
        { name: "Far North", desc: "Region • Maroua", icon: "🏜️" },
        { name: "East", desc: "Region • Bertoua", icon: "🌳" },
    ];

    return (
        <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto relative z-40">
            {/* Mobile Search Trigger */}
            <div className="md:hidden w-full px-4">
                <div className="flex items-center gap-3 bg-white rounded-full shadow-md border border-gray-200 p-3" onClick={() => setOpenWhere(true)}>
                    <Search className="h-5 w-5 text-gray-500 ml-2" />
                    <div className="flex-1">
                        <span className="text-sm font-semibold text-gray-500">Commencer ma recherche</span>
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
                                ) : activeTab === "flexible" ? (
                                    `${flexibleDuration} in ${flexibleMonths.length > 0 ? flexibleMonths.length + " months" : "anytime"}`
                                ) : (
                                    <span className="text-gray-400 font-normal">{t("add dates")}</span>
                                )}
                            </div>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[88vw] max-w-[330px] sm:w-[660px] sm:max-w-[660px] p-0 rounded-3xl shadow-xl border-0 mt-4 overflow-hidden" align="center">
                        <div className="p-3 sm:p-6 max-w-[330px] mx-auto sm:max-w-none">
                            {/* Top category tabs (visual only) */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                    <button className="text-sm font-semibold text-gray-900">Logements</button>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Fermer"
                                    className="h-8 w-8 rounded-full border border-gray-200 grid place-items-center hover:bg-gray-50"
                                    onClick={() => setOpenWhen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Destination / Nearby toggle */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${placeTab === 'destination' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                                    onClick={() => setPlaceTab('destination')}
                                    type="button"
                                >
                                    Destination
                                </button>
                                <button
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${placeTab === 'nearby' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                                    onClick={() => setPlaceTab('nearby')}
                                    type="button"
                                >
                                    À proximité
                                </button>
                            </div>

                            <h3 className="text-lg font-semibold mb-3">Quand ?</h3>

                            <div className="flex justify-center mb-6 bg-gray-100 p-1 rounded-full w-fit mx-auto">
                                <button
                                    onClick={() => setActiveTab("dates")}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${activeTab === "dates" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:bg-gray-200"}`}
                                >
                                    Dates
                                </button>
                                <button
                                    onClick={() => setActiveTab("flexible")}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${activeTab === "flexible" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:bg-gray-200"}`}
                                >
                                    Flexible
                                </button>
                            </div>

                            {whenStep === 'dates' && activeTab === "dates" && (
                                <div>
                                    <div className={`rounded-2xl border border-gray-200 p-4 bg-white shadow-lg ${isMobile ? 'max-w-[300px] mx-auto' : ''}`}>
                                        <Calendar
                                            mode="range"
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={isMobile ? 1 : 2}
                                            className={`border-0 ${isMobile ? 'scale-[0.86] origin-top-left transform-gpu' : ''}`}
        
                                            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                                            locale={fr}
                                            formatters={{
                                                formatWeekdayName: (day) => format(day, 'EEEEE', { locale: fr }).toUpperCase(),
                                            }}
                                            classNames={{
                                                caption_label: "text-base font-semibold capitalize",
                                                ...(isMobile ? {
                                                    head_cell: 'text-muted-foreground rounded-md w-7 font-normal text-[0.7rem]',
                                                    day: 'h-7 w-7 p-0 font-normal aria-selected:opacity-100 rounded-full hover:bg-gray-100',
                                                    cell: 'h-7 w-7 text-center text-[0.8rem] p-0 relative',
                                                } : {})
                                            }}
                                        />
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {[0,1,2,3].map((tol) => (
                                                <button
                                                    key={tol}
                                                    type="button"
                                                    onClick={() => setDateTolerance(tol as 0|1|2|3)}
                                                    className={`px-2.5 py-1 rounded-full border text-xs ${dateTolerance === tol ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-black'}`}
                                                >
                                                    {tol === 0 ? 'Dates exactes' : `± ${tol} jour${tol>1?'s':''}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {whenStep === 'guests' && (
                                <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-lg max-w-[330px] mx-auto">
                                    {/* Quand summary row */}
                                    <div
                                        className="flex items-center justify-between px-5 py-3 border-b border-gray-200 cursor-pointer"
                                        onClick={() => setWhenStep('dates')}
                                    >
                                        <span className="text-sm text-gray-700">Quand</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {date?.from
                                                ? `${format(date.from, 'd MMM', { locale: fr })}${date?.to ? ` - ${format(date.to as Date, 'd MMM', { locale: fr })}` : ''}`
                                                : 'Ajouter des dates'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold px-5 py-4">Qui ?</h3>
                                    <div className="divide-y divide-gray-200">
                                        {[
                                            { type: "adults", label: "Adultes", sub: "13 ans et plus" },
                                            { type: "children", label: "Enfants", sub: "De 2 à 12 ans" },
                                            { type: "infants", label: "Bébés", sub: "- de 2 ans" },
                                            { type: "pets", label: "Animaux domestiques", sub: "Vous voyagez avec un animal d'assistance ?" },
                                        ].map((item) => (
                                            <div key={item.type} className="flex items-center justify-between px-5 py-5">
                                                <div className="pr-6">
                                                    <div className="font-semibold text-gray-900">{item.label}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {item.type === 'pets' ? (
                                                            <button type="button" className="underline underline-offset-2 hover:text-gray-700">
                                                                {item.sub}
                                                            </button>
                                                        ) : (
                                                            item.sub
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:border-black disabled:opacity-20 grid place-items-center"
                                                        onClick={() => updateGuest(item.type as keyof typeof guests, 'sub')}
                                                        disabled={guests[item.type as keyof typeof guests] === 0}
                                                        aria-label={`Decrease ${item.label}`}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-6 text-center text-gray-900 font-medium">
                                                        {guests[item.type as keyof typeof guests]}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:border-black grid place-items-center"
                                                        onClick={() => updateGuest(item.type as keyof typeof guests, 'add')}
                                                        aria-label={`Increase ${item.label}`}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === "months" && (
                                <div className="text-center">
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
                            )}

                            {activeTab === "flexible" && (
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold mb-4">How long would you like to stay?</h3>
                                    <div className="flex justify-center gap-3">
                                        {FLEXIBLE_OPTIONS.map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setFlexibleDuration(option)}
                                                className={`px-6 py-2 rounded-full border text-sm font-medium transition-colors ${flexibleDuration === option ? "border-black bg-gray-50" : "border-gray-300 hover:border-black"}`}
                                            >
                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer actions */}
                            <div className="flex items-center justify-between mt-6">
                                <button
                                    type="button"
                                    className="text-sm underline"
                                    onClick={() => { setDate(undefined); setFlexibleMonths([]); setFlexibleDuration("weekend"); setWhenStep('dates'); setGuests({ adults: 0, children: 0, infants: 0, pets: 0 }); }}
                                >
                                    Tout effacer
                                </button>
                                {whenStep === 'dates' ? (
                                    <Button
                                        type="button"
                                        onClick={() => setWhenStep('guests')}
                                    >
                                        Suivant
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        className="bg-[#FF385C] hover:bg-[#D9324E] text-white"
                                        onClick={() => { setOpenWhen(false); runSearch(); }}
                                    >
                                        Rechercher
                                    </Button>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="h-8 w-px bg-gray-200" />

                {/* Who trigger (opens main popover to guests step) */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setWhenStep('guests'); setOpenWhen(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWhenStep('guests'); setOpenWhen(true); } }}
                    className={`flex-1 px-8 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors rounded-full`}
                >
                    <label className="block text-xs font-bold text-gray-900 mb-0.5 uppercase tracking-wider">
                        {t("who")}
                    </label>
                    <div className="text-sm text-gray-900 font-medium truncate">
                        {guests.adults + guests.children > 0
                            ? `${guests.adults + guests.children} guests`
                            : <span className="text-gray-400 font-normal">{t("add guests")}</span>}
                    </div>
                </div>

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

export default MbokoSearch;
