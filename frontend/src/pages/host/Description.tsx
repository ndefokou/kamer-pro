import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const Description: React.FC = () => {
    const navigate = useNavigate();
    const { draft, updateDraft, nextStep, previousStep } = useHost();
    const [description, setDescription] = useState(draft.description || '');

    const isValid = description.length >= 50 && description.length <= 500;
    const charCount = description.length;

    const handleContinue = () => {
        if (isValid) {
            updateDraft({ description });
            nextStep();
            navigate('/host/booking-settings');
        }
    };

    const handleBack = () => {
        updateDraft({ description });
        previousStep();
        navigate('/host/title');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">Create your description</h1>
                    <p className="text-muted-foreground text-lg">
                        Share what makes your place special
                    </p>
                </div>

                <div className="mb-8">
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your place..."
                        className="min-h-[200px] text-lg p-4"
                        maxLength={500}
                    />
                    <div className="flex justify-between mt-2 text-sm">
                        <span className={charCount < 50 ? 'text-destructive' : 'text-muted-foreground'}>
                            {charCount < 50 ? `${50 - charCount} more characters needed` : 'Looks good!'}
                        </span>
                        <span className="text-muted-foreground">{charCount}/500</span>
                    </div>
                </div>

                <div className="bg-muted p-6 rounded-lg mb-8">
                    <h3 className="font-semibold mb-3">Writing tips:</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Describe the space and how guests will use it</li>
                        <li>• Mention special amenities or features</li>
                        <li>• Highlight what's nearby (restaurants, attractions, etc.)</li>
                        <li>• Share what guests love about your place</li>
                        <li>• Be honest and accurate</li>
                    </ul>
                </div>

                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={handleBack}>
                        Back
                    </Button>
                    <Button onClick={handleContinue} disabled={!isValid} size="lg">
                        Continue
                    </Button>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                    Step 5 of 9
                </div>
            </div>
        </div>
    );
};

export default Description;
