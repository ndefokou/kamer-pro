import React from 'react';
import { Globe } from 'lucide-react';
import i18n from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LanguageSwitcher: React.FC = () => {
  const current = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  const change = async (lng: 'en' | 'fr') => {
    await i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-3 hover:bg-gray-100 rounded-full transition-colors" aria-label="Change language">
          <Globe className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => change('en')} className={current === 'en' ? 'font-semibold' : ''}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => change('fr')} className={current === 'fr' ? 'font-semibold' : ''}>
          Français
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
