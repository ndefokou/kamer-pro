import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home as HomeIcon, Globe, Menu, User } from 'lucide-react';
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
                    <DropdownMenuItem className="font-semibold">
                        {t("Voyages")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="font-semibold">
                        {t("Favoris")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/host/dashboard')}>
                        {t("Gérer mon annonce")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                        {t("Compte")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        {t("Déconnexion")}
                    </DropdownMenuItem>
                </>
            ) : (
                <>
                    <DropdownMenuItem onClick={() => navigate('/webauth-login?tab=register')} className="flex flex-col items-start gap-1 cursor-pointer">
                        <div className="font-semibold">{t("Devenir hôte")}</div>
                        <div className="text-xs text-gray-500">Devenir hôte et gagner des revenus supplémentaires, c'est facile.</div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/webauth-login')} className="cursor-pointer">
                        {t("Se connecter ou s'inscrire")}
                    </DropdownMenuItem>
                </>
            )}
        </>
    );

    return (
        <header className="border-b border-gray-200 sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                        <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span className="text-xl font-bold text-green-600">MboaMaison</span>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="hidden md:flex items-center gap-8">
                        <button className="flex items-center gap-2 px-4 py-3 rounded-full hover:bg-gray-100 transition-colors" onClick={() => navigate('/')}>
                            <HomeIcon className="h-5 w-5" />
                            <span className="font-medium">{t("Logements")}</span>
                        </button>
                    </div>

                    {/* Right Menu */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            className="text-sm font-semibold hover:bg-gray-100 px-4 py-3 rounded-full transition-colors"
                            onClick={() => navigate('/webauth-login?tab=register')}
                        >
                            {t("Devenir hôte")}
                        </button>
                        <button className="p-3 hover:bg-gray-100 rounded-full transition-colors">
                            <Globe className="h-5 w-5" />
                        </button>
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
                </div>
            </div>
        </header>
    );
};

export default Header;
