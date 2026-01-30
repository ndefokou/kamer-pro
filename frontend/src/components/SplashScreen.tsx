import React from 'react';
import { Home } from 'lucide-react';

const SplashScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999]">
            <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    {/* Outer Ring */}
                    <div className="absolute -inset-4 rounded-full border-2 border-primary/10 animate-[ping_3s_infinite]" />

                    {/* Logo Container */}
                    <div className="relative h-24 w-24 bg-primary flex items-center justify-center rounded-2xl shadow-2xl shadow-primary/20 transform rotate-12">
                        <Home className="h-12 w-12 text-white -rotate-12" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Le <span className="text-primary">Mboko</span>
                    </h1>
                    <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                    </div>
                </div>

                <p className="text-gray-400 text-sm font-medium absolute -bottom-16 whitespace-nowrap">
                    You can find home every where in Cameroon here
                </p>
            </div>
        </div>
    );
};

export default SplashScreen;
