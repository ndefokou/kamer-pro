import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Heart, CalendarCheck, Calendar, MessageSquare, User } from "lucide-react";

const MobileNav = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const isHostSection = location.pathname.startsWith('/host');

    const navItems = [
        {
            label: t("Explore"),
            icon: Home,
            path: "/",
        },
        {
            label: t("Favorites"),
            icon: Heart,
            path: "/wishlist",
        },
        {
            label: t("Reservations"),
            icon: CalendarCheck,
            path: isHostSection ? "/host/reservations" : "/bookings",
        },
        {
            label: t("Calendar"),
            icon: Calendar,
            path: "/host/calendar",
            showOnlyInHost: true,
        },
        {
            label: t("Messages"),
            icon: MessageSquare,
            path: "/messages",
        },
        {
            label: t("Profile"),
            icon: User,
            path: "/account",
        },
    ];

    const filteredNavItems = navItems.filter(item => {
        if ('showOnlyInHost' in item && item.showOnlyInHost) {
            return isHostSection;
        }
        return true;
    });

    const isActive = (path: string) => {
        if (path === "/" && location.pathname !== "/") return false;
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 pb-safe transition-all duration-300 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto px-2">
                <ul className={`grid h-16 ${filteredNavItems.length === 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
                    {filteredNavItems.map((item) => (
                        <li key={item.path} className="flex items-center justify-center">
                            <button
                                onClick={() => navigate(item.path)}
                                className={`flex flex-col items-center gap-1 group w-full h-full justify-center transition-all ${isActive(item.path) ? "text-green-600" : "text-gray-500 hover:text-gray-900 active:text-green-600"
                                    }`}
                            >
                                <div className={`p-1 rounded-full transition-transform group-active:scale-90 ${isActive(item.path) ? "text-green-600" : ""
                                    }`}>
                                    <item.icon className={`h-[22px] w-[22px] transition-colors ${isActive(item.path) ? "stroke-[2.5px]" : "stroke-[1.5px]"
                                        }`} />
                                </div>
                                <span className={`text-[10px] font-medium transition-colors ${isActive(item.path) ? "text-green-600" : ""
                                    }`}>
                                    {item.label}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default MobileNav;
