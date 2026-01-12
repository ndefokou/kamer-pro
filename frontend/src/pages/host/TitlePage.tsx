import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TitlePage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { draft, updateDraft, nextStep, previousStep } = useHost();
    const [title, setTitle] = useState(draft.title || '');

    const isValid = title.length >= 10 && title.length <= 50;
    const charCount = title.length;

    const handleContinue = () => {
        if (isValid) {
            updateDraft({ title });
            nextStep();
            navigate('/host/description');
        }
    };

    const handleBack = () => {
        updateDraft({ title });
        previousStep();
        navigate('/host/photos');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">{t('host.title.title', "Now, let's give your place a title")}</h1>
                    <p className="text-muted-foreground text-lg">
                        {t('host.title.subtitle', 'Short titles work best. Have fun with it—you can always change it later.')}
                    </p>
                </div>

                <div className="mb-8">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('host.title.placeholder', 'e.g., Cozy apartment in the heart of Yaoundé') as string}
                        className="text-2xl p-6 h-auto"
                        maxLength={50}
                    />
                    <div className="flex justify-between mt-2 text-sm">
                        <span className={charCount < 10 ? 'text-destructive' : 'text-muted-foreground'}>
                            {charCount < 10 ? t('host.title.moreCharsNeeded', '{{count}} more characters needed', { count: 10 - charCount }) : t('host.title.looksGood', 'Looks good!')}
                        </span>
                        <span className="text-muted-foreground">{charCount}/50</span>
                    </div>
                </div>

                <div className="bg-muted p-6 rounded-lg mb-8">
                    <h3 className="font-semibold mb-3">Tips for a great title:</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Highlight what makes your place special</li>
                        <li>• Mention the location or neighborhood</li>
                        <li>• Keep it short and catchy</li>
                        <li>• Avoid ALL CAPS or excessive punctuation</li>
                    </ul>
                </div>

                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={handleBack}>
                        {t('common.back', 'Back')}
                    </Button>
                    <Button onClick={handleContinue} disabled={!isValid} size="lg">
                        {t('common.continue', 'Continue')}
                    </Button>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {t('common.stepOf', 'Step {{current}} of {{total}}', { current: 4, total: 9 })}
                </div>
            </div>
        </div>
    );
};

export default TitlePage;
