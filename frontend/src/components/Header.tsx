import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home as HomeIcon, Menu, User } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

const Header: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const UserMenuContent = () => (
        <>
            {user ? (
                <>
                    <DropdownMenuItem className="font-semibold" onClick={() => navigate('/messages')}>
                        {t("Messages")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="font-semibold">
                        {t("Notifications")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="font-semibold" onClick={() => navigate('/bookings')}>
                        {t("Reservations")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="font-semibold" onClick={() => navigate('/wishlist')}>
                        {t("Favorites")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/host/dashboard')}>
                        {t("Manage my listing")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                        {t("Account")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        {t("Log out")}
                    </DropdownMenuItem>
                </>
            ) : (
                <>
                    <DropdownMenuItem onClick={() => navigate('/webauth-login?tab=register&redirect=/host/dashboard')} className="flex flex-col items-start gap-1 cursor-pointer">
                        <div className="font-semibold">{t("Become a host")}</div>
                        <div className="text-xs text-gray-500">Become a host and earn extra income easily.</div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(`/webauth-login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)} className="cursor-pointer">
                        {t("Log in or sign up")}
                    </DropdownMenuItem>
                </>
            )}
        </>
    );

    return (
        <header className="border-b border-gray-200 sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 pt-safe">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                        <img src="/logo.png" alt="Le Mboko" className="h-8 w-8 object-contain" />
                        <span className="text-xl font-bold text-primary">Le Mboko</span>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="hidden md:flex items-center gap-8">
                        <button className="flex items-center gap-2 px-4 py-3 rounded-full hover:bg-gray-100 transition-colors" onClick={() => navigate('/')}>
                            <HomeIcon className="h-5 w-5" />
                            <span className="font-medium">{t("Stays")}</span>
                        </button>
                    </div>

                    {/* Right Menu */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            className="text-sm font-semibold hover:bg-gray-100 px-4 py-3 rounded-full transition-colors"
                            onClick={() => navigate(user ? '/host/dashboard' : '/webauth-login?tab=register&redirect=/host/dashboard')}
                        >
                            {t("Become a host")}
                        </button>
                        <LanguageSwitcher />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex items-center gap-3 border border-gray-300 rounded-full px-3 py-2 hover:shadow-md transition-shadow cursor-pointer">
                                    <Menu className="h-4 w-4" />
                                    <div className="bg-gray-700 rounded-full p-1.5">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <UserMenuContent />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="md:hidden flex items-center gap-2">
                        <LanguageSwitcher />
                        <button
                            className="text-xs font-semibold hover:bg-gray-100 px-3 py-2 rounded-full transition-colors"
                            onClick={() => navigate(user ? '/host/dashboard' : '/webauth-login?tab=register&redirect=/host/dashboard')}
                        >
                            {t("Become a host")}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
