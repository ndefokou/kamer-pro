import React from 'react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import MobileNav from '@/components/MobileNav';
import { Calendar as CalendarIcon } from 'lucide-react';

const CalendarPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-white pb-20 md:pb-0">
            <SEO
                title={t('Calendar')}
                description="View your upcoming trips and reservations on the calendar."
            />
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">{t('Calendar')}</h1>

                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <CalendarIcon className="h-12 w-12 text-[#FF385C]" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Calendar View Coming Soon</h2>
                    <p className="text-gray-500 text-center max-w-md px-6">
                        We're working on a beautiful calendar view to help you manage your trips and hosting schedule in one place.
                    </p>
                </div>
            </main>
            <MobileNav />
        </div>
    );
};

export default CalendarPage;
