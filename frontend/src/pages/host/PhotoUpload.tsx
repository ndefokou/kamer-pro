import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Upload, X, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getImageUrl } from '@/lib/utils';

const PhotoUpload: React.FC = () => {
    const navigate = useNavigate();
    const { draft, updateDraft, nextStep, previousStep } = useHost();
    const { toast } = useToast();
    const [photos, setPhotos] = useState<string[]>(draft.photos || []);
    const [coverIndex, setCoverIndex] = useState(draft.coverPhotoIndex || 0);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        if (photos.length + files.length > 10) {
            toast({
                title: 'Too many photos',
                description: 'You can upload a maximum of 10 photos',
                variant: 'destructive',
            });
            return;
        }

        setUploading(true);

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('images', file);
        });

        try {
            const response = await fetch('/api/upload/images', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            const newPhotos = [...photos, ...data.urls];
            setPhotos(newPhotos);

            toast({
                title: 'Photos uploaded',
                description: `${files.length} photo(s) uploaded successfully`,
            });
        } catch (error) {
            toast({
                title: 'Upload failed',
                description: 'Failed to upload photos. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        setPhotos(newPhotos);
        if (coverIndex === index) {
            setCoverIndex(0);
        } else if (coverIndex > index) {
            setCoverIndex(coverIndex - 1);
        }
    };

    const setCover = (index: number) => {
        setCoverIndex(index);
    };

    const handleContinue = () => {
        updateDraft({ photos, coverPhotoIndex: coverIndex });
        nextStep();
        navigate('/host/title');
    };

    const handleBack = () => {
        updateDraft({ photos, coverPhotoIndex: coverIndex });
        previousStep();
        navigate('/host/location');
    };

    return (
        <div className="min-h-screen bg-background p-4 py-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Add photos of your place</h1>
                    <p className="text-muted-foreground">
                        You'll need at least 3 photos to get started. You can add more or make changes later.
                    </p>
                </div>

                {/* Upload Zone */}
                <div className="mb-8">
                    <label
                        htmlFor="photo-upload"
                        className="block border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">Drag your photos here</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Choose at least 3 photos (max 10)
                        </p>
                        <Button type="button" variant="outline" disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Upload from your device'}
                        </Button>
                        <input
                            id="photo-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                </div>

                {/* Photo Grid */}
                {photos.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">
                            {photos.length} photo{photos.length !== 1 ? 's' : ''}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {photos.map((photo, index) => (
                                <div
                                    key={index}
                                    className={`relative aspect-square rounded-lg overflow-hidden group ${index === coverIndex ? 'ring-4 ring-primary' : ''
                                        }`}
                                >
                                    <img
                                        src={getImageUrl(photo)}
                                        alt={`Photo ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setCover(index)}
                                        >
                                            <Star className="h-4 w-4 mr-1" />
                                            {index === coverIndex ? 'Cover' : 'Set as cover'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => removePhoto(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {index === coverIndex && (
                                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                                            Cover photo
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mt-12 pt-6 border-t">
                    <Button variant="outline" onClick={handleBack}>
                        Back
                    </Button>
                    <Button
                        onClick={handleContinue}
                        disabled={photos.length < 3}
                        size="lg"
                    >
                        Continue
                    </Button>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                    Step 4 of 10
                </div>
            </div>
        </div>
    );
};

export default PhotoUpload;
