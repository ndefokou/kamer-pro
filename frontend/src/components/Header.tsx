import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home as HomeIcon, Menu, User, ChevronLeft } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import { getPublicPath } from '@/api/client';

const Header: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isHomePage = location.pathname === '/';

    const UserMenuContent = () => (
        <>
            {user ? (
                <>
                    <DropdownMenuItem className="font-semibold" onClick={() => navigate('/messages')}>
                        {t("Messages")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="font-semibold" onClick={() => navigate('/bookings')}>
                        {t("Reservations")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="font-semibold" onClick={() => navigate('/wishlist')}>
                        {t("Favorites")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="hidden md:block" />
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
                    <DropdownMenuItem onClick={() => navigate('/login?tab=register&redirect=/host/dashboard')} className="md:flex flex-col items-start gap-1 cursor-pointer hidden">
                        <div className="font-semibold">{t("Become a host")}</div>
                        <div className="text-xs text-gray-500">{t("auth.becomeHostDesc")}</div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="hidden md:block" />
                    <DropdownMenuItem onClick={() => navigate('/login')} className="cursor-pointer">
                        {t("Log in or sign up")}
                    </DropdownMenuItem>
                </>
            )}
        </>
    );

    return (
        <header className="border-b border-gray-200 sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 pt-safe">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16 md:h-20 gap-4">
                    {/* Left Section: Back and Logo */}
                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                        {!isHomePage && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(-1)}
                                className="rounded-full shrink-0 h-10 w-10"
                                aria-label="Go back"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        )}

                        <div className="flex items-center gap-2 cursor-pointer overflow-hidden" onClick={() => navigate("/")}>
                            <div className="relative h-10 w-10 shrink-0">
                                <img
                                    src={getPublicPath("logo.png")}
                                    alt="Le Mboko"
                                    width={40}
                                    height={40}
                                    loading="eager"
                                    decoding="sync"
                                    className="h-10 w-10 object-contain rounded-lg"
                                />
                                <div className="absolute inset-0 bg-primary text-white flex items-center justify-center rounded-lg font-bold text-xl select-none pointer-events-none" style={{ zIndex: -1 }}>
                                    M
                                </div>
                            </div>
                            <span className="hidden md:block font-bold text-xl text-[#2F4F4F] tracking-tight">Le Mboko</span>
                        </div>
                    </div>

                    {/* Navigation Tabs (Centered visually on larger screens) */}
                    <div className="hidden lg:flex items-center gap-8 flex-1 justify-center">
                        <button className="flex items-center gap-2 px-4 py-3 rounded-full hover:bg-gray-100 transition-colors" onClick={() => navigate('/')}>
                            <HomeIcon className="h-5 w-5 text-primary" />
                            <span className="font-medium">{t("Stays")}</span>
                        </button>
                    </div>

                    {/* Right Menu */}
                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <button
                            className="text-sm font-semibold hover:bg-gray-100 px-2 sm:px-4 py-3 rounded-full transition-colors whitespace-nowrap"
                            onClick={() => navigate(user ? '/host/dashboard' : '/login?tab=register&redirect=/host/dashboard')}
                        >
                            {t("Become a host")}
                        </button>

                        <div className="flex items-center">
                            <LanguageSwitcher />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex items-center gap-3 border border-gray-300 rounded-full px-3 py-2 hover:shadow-md transition-shadow cursor-pointer bg-white">
                                    <Menu className="h-4 w-4" />
                                    <div className="bg-gray-700 rounded-full p-1.5 shrink-0">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">

                                <UserMenuContent />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
