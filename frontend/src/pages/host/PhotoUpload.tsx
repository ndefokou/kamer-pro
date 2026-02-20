import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHost } from '@/contexts/HostContext';
import { Button } from '@/components/ui/button';
import { Upload, X, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';
import apiClient from '@/api/client';

const PhotoUpload: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { draft, updateDraft, nextStep, previousStep } = useHost();
    const { toast } = useToast();
    const [photos, setPhotos] = useState<string[]>(draft.photos || []);
    const [coverIndex, setCoverIndex] = useState(draft.coverPhotoIndex || 0);
    const [uploading, setUploading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    // Debug: Log photos array whenever it changes
    useEffect(() => {
        console.log('Photos state changed:', photos);
        console.log('Photos count:', photos.length);
        const uniquePhotos = [...new Set(photos)];
        console.log('Unique photos count:', uniquePhotos.length);
        if (photos.length !== uniquePhotos.length) {
            console.warn('DUPLICATE PHOTOS DETECTED!');
            console.warn('Duplicates:', photos.filter((item, index) => photos.indexOf(item) !== index));
        }
    }, [photos]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Prevent concurrent uploads
        if (uploading) {
            console.log('Upload already in progress, ignoring');
            return;
        }

        console.log('Starting upload for', files.length, 'file(s)');
        setUploading(true);

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('images', file);
        });

        try {
            const response = await apiClient.post('/upload/images', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = response.data;
            console.log('Upload response:', data);
            console.log('URLs received:', data.urls);

            // Use functional update to avoid stale closure issues
            setPhotos(prevPhotos => {
                console.log('Previous photos count:', prevPhotos.length);
                const newPhotos = [...prevPhotos, ...data.urls];
                console.log('New photos count:', newPhotos.length);
                return newPhotos;
            });

            toast({
                title: t('photos.uploadSuccessTitle', 'Photos uploaded'),
                description: t('photos.uploadSuccessDesc', '{{count}} photo(s) uploaded successfully', { count: files.length }),
            });

            // Reset the file input to prevent duplicate uploads
            e.target.value = '';
        } catch (error: any) {
            console.error('Upload error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            const errorMessage = error.response?.data?.message || t('photos.uploadFailedDesc', 'Failed to upload photos. Please try again.');

            toast({
                title: t('photos.uploadFailedTitle', 'Upload failed'),
                description: errorMessage,
                variant: 'destructive',
            });

            // Reset the file input even on error
            e.target.value = '';
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
                    <h1 className="text-4xl font-bold mb-2">{t('photos.title', 'Add photos of your place')}</h1>
                    <p className="text-muted-foreground">
                        {t('photos.subtitle', "You'll need at least 3 photos to get started. You can add more or make changes later.")}
                    </p>
                </div>

                {/* Upload Zone */}
                <div className="mb-8">
                    <label
                        htmlFor="photo-upload"
                        className="block border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">{t('photos.dropTitle', 'Drag your photos here')}</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('photos.dropHelp', 'Choose at least 3 photos')}
                        </p>

                        <Button type="button" variant="outline" disabled={uploading}>
                            {uploading ? t('photos.uploading', 'Uploading...') : t('photos.uploadFromDevice', 'Upload from your device')}
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
                            {photos.length} {photos.length !== 1 ? t('photos.photosPlural', 'photos') : t('photos.photoSingular', 'photo')}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {photos.map((photo, index) => (
                                <div
                                    key={index}
                                    className={`relative aspect-square rounded-lg overflow-hidden group cursor-pointer ${index === coverIndex ? 'ring-4 ring-primary' : ''
                                        }`}
                                    onClick={() => setSelectedPhoto(photo)}
                                >
                                    <OptimizedImage
                                        src={getImageUrl(photo)}
                                        alt={`Photo ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => { e.stopPropagation(); setCover(index); }}
                                        >
                                            <Star className="h-4 w-4 mr-1" />
                                            {index === coverIndex ? t('photos.cover', 'Cover') : t('photos.setAsCover', 'Set as cover')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {index === coverIndex && (
                                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                                            {t('photos.coverPhoto', 'Cover photo')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Photo Lightbox */}
                {selectedPhoto && (
                    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 md:p-8" onClick={() => setSelectedPhoto(null)}>
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4 left-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <OptimizedImage
                            src={getImageUrl(selectedPhoto)}
                            alt="Full size view"
                            className="w-full h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                <div className="flex justify-between items-center mt-12 pt-6 border-t">
                    <Button variant="outline" onClick={handleBack}>
                        {t('common.back', 'Back')}
                    </Button>
                    <Button
                        onClick={handleContinue}
                        disabled={photos.length < 3}
                        size="lg"
                    >
                        {t('common.continue', 'Continue')}
                    </Button>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {t('common.stepOf', 'Step {{current}} of {{total}}', { current: 4, total: 10 })}
                </div>
            </div>
        </div >
    );
};

export default PhotoUpload;
