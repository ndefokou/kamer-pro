import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, Settings, Plus, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';

const getInitials = (name: string) => {
    const n = name?.trim();
    if (!n) return 'AD';
    const parts = n.split(/\s+/);
    if (parts.length === 1) return n.slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
};

const HostHeader: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const username = user?.username || '';
    const initials = getInitials(username || 'User');

    const handleLogout = async () => {
        await logout();
        setIsUserMenuOpen(false);
        navigate('/');
    };

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
                <div className="flex items-center gap-12">
                    <div className="text-green-600 font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
                        MboaMaison
                    </div>
                    <nav className="hidden md:flex gap-8 text-sm font-medium">
                        <a
                            href="/host/today"
                            className={`${isActive('/host/today') ? 'text-gray-900 font-semibold relative pb-6' : 'text-gray-600 hover:text-gray-900 transition-colors'}`}
                        >
                            Today
                            {isActive('/host/today') && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>}
                        </a>
                        <a
                            href="/host/calendar"
                            className={`${isActive('/host/calendar') ? 'text-gray-900 font-semibold relative pb-6' : 'text-gray-600 hover:text-gray-900 transition-colors'}`}
                        >
                            Calendar
                            {isActive('/host/calendar') && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>}
                        </a>
                        <a
                            href="/host/dashboard"
                            className={`${isActive('/host/dashboard') ? 'text-gray-900 font-semibold relative pb-6' : 'text-gray-600 hover:text-gray-900 transition-colors'}`}
                        >
                            Listings
                            {isActive('/host/dashboard') && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>}
                        </a>
                        <a
                            href="/messages?view=host"
                            className={`${location.pathname === '/messages' ? 'text-gray-900 font-semibold relative pb-6' : 'text-gray-600 hover:text-gray-900 transition-colors'}`}
                        >
                            Messages
                            {location.pathname === '/messages' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>}
                        </a>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        className="text-sm font-medium hover:bg-gray-100 rounded-full px-4"
                        onClick={() => navigate('/')}
                    >
                        Switch to traveling
                    </Button>
                    <Sheet open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
                        <SheetTrigger asChild>
                            <div className="flex items-center gap-3 border border-gray-300 rounded-full py-1.5 px-3 hover:shadow-md transition-shadow cursor-pointer">
                                <Menu className="h-4 w-4 text-gray-700" />
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.profile_picture_url || "/placeholder-user.jpg"} />
                                    <AvatarFallback className="bg-gray-700 text-white text-xs">{initials}</AvatarFallback>
                                </Avatar>
                            </div>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[360px] sm:w-[420px]">
                            <SheetHeader>
                                <SheetTitle>Menu</SheetTitle>
                            </SheetHeader>
                            <div className="mt-6 space-y-1">
                                <div className="flex items-center gap-3 pb-4 border-b">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={user?.profile_picture_url || "/placeholder-user.jpg"} />
                                        <AvatarFallback className="bg-gray-700 text-white text-sm">{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="font-semibold text-gray-900">{username || 'User'}</div>
                                </div>

                                <button
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        navigate('/account');
                                    }}
                                >
                                    <Settings className="h-5 w-5" />
                                    <span>Account settings</span>
                                </button>
                                <button
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        navigate('/host/intro');
                                    }}
                                >
                                    <Plus className="h-5 w-5" />
                                    <span>Create a new listing</span>
                                </button>
                                <div className="pt-3 mt-2 border-t">
                                    <button
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-red-600"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="h-5 w-5" />
                                        <span>Log out</span>
                                    </button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
};

export default HostHeader;
