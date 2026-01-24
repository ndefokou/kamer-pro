import React from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from '@/lib/translate';

interface Props {
  text?: string | null;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  langOverride?: string;
}

const TranslatedText: React.FC<Props> = ({ text, as = 'span', className, langOverride }) => {
  const { i18n } = useTranslation();
  const lang = (langOverride || i18n.language || 'en').split('-')[0];
  const [value, setValue] = React.useState<string | undefined>(text || undefined);
  const key = React.useMemo(() => `${lang}::${text || ''}`, [lang, text]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const original = text || '';
      if (!original) { setValue(''); return; }
      const target = lang === 'fr' ? 'fr' : 'en';
      try {
        if (target === 'en') { setValue(original); return; }
        const out = await translateText(original, target);
        if (!cancelled) setValue(out || original);
      } catch {
        if (!cancelled) setValue(original);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [lang, text]);

  const Comp = as as React.ElementType;
  return <Comp className={className}>{value}</Comp>;
};

export default TranslatedText;
