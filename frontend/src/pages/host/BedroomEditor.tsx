import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, X, Trash2 } from 'lucide-react';
import apiClient from '@/api/client';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';

interface BedroomPhoto {
    id: string;
    url: string;
    caption: string;
}

interface PendingPhoto {
    file: File;
    preview: string;
}

const BedroomEditor: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const [bedroomPhotos, setBedroomPhotos] = useState<BedroomPhoto[]>([]);
    const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPhotos();
    }, [id]);

    const fetchPhotos = async () => {
        try {
            const response = await apiClient.get(`/listings/${id}`);
            const listing = response.data;

            // Filter bedroom photos
            const bedroom = listing.photos?.filter((p: any) =>
                p.caption?.toLowerCase().includes('bedroom') ||
                p.room_type === 'bedroom'
            ) || [];

            setBedroomPhotos(bedroom);
        } catch (error) {
            console.error('Failed to fetch photos:', error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newPendingPhotos: PendingPhoto[] = Array.from(files).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setPendingPhotos(prev => [...prev, ...newPendingPhotos]);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removePendingPhoto = (index: number) => {
        setPendingPhotos(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const handleSave = async () => {
        if (pendingPhotos.length === 0) return;

        setUploading(true);
        try {
            // First, get all existing photos from the listing
            const listingResponse = await apiClient.get(`/listings/${id}`);
            const allExistingPhotos = listingResponse.data.photos || [];

            // Upload new photos
            const uploadedUrls: string[] = [];
            for (const pending of pendingPhotos) {
                const formData = new FormData();
                formData.append('file', pending.file);

                const response = await apiClient.post('/upload/images', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                uploadedUrls.push(response.data.urls[0]);
            }

            // Prepare the complete photos array (existing + new)
            const existingPhotosData = allExistingPhotos.map((p: any) => ({
                url: p.url,
                caption: p.caption,
                room_type: p.room_type,
                is_cover: p.is_cover === 1,
                display_order: p.display_order
            }));

            const newPhotosData = uploadedUrls.map(url => ({
                url,
                caption: 'Bedroom photo',
                room_type: 'bedroom',
                is_cover: false,
                display_order: 0
            }));

            // Sync all photos (existing + new)
            await apiClient.post(`/listings/${id}/photos`, {
                photos: [...existingPhotosData, ...newPhotosData]
            });

            // Clean up pending photos
            pendingPhotos.forEach(p => URL.revokeObjectURL(p.preview));
            setPendingPhotos([]);

            // Refresh the photos list
            await fetchPhotos();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    const totalPhotos = bedroomPhotos.length + pendingPhotos.length;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate(`/host/editor/${id}`)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-lg font-semibold">{t('host.editor.bedroom', 'Bedroom')}</h2>
                    <div className="w-10" />
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-semibold mb-2">{t('host.editor.bedroomPhotos', 'Bedroom photos')}</h1>
                <p className="text-gray-500 mb-8">
                    {t('host.editor.addBedroomPhotosHelp', 'Add photos of your bedroom. You can select multiple photos at once.')}
                </p>

                {/* Photo Grid */}
                {totalPhotos > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        {/* Existing photos */}
                        {bedroomPhotos.map((photo) => (
                            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                                <OptimizedImage
                                    src={getImageUrl(photo.url)}
                                    alt={photo.caption}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}

                        {/* Pending photos */}
                        {pendingPhotos.map((photo, index) => (
                            <div key={`pending-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-500">
                                <OptimizedImage
                                    src={photo.preview}
                                    alt={t('common.pendingUpload', 'Pending upload') as string}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={() => removePendingPhoto(index)}
                                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                                    {t('common.new', 'New')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white mb-6">
                    {totalPhotos === 0 && (
                        <div className="mb-6">
                            {/* Bed icon - 3D isometric style */}
                            <svg
                                className="h-32 w-32 mx-auto mb-6"
                                viewBox="0 0 120 100"
                                fill="none"
                            >
                                {/* Bed base */}
                                <path
                                    d="M20 60 L100 60 L100 75 L20 75 Z"
                                    fill="#E5E7EB"
                                    stroke="#9CA3AF"
                                    strokeWidth="1.5"
                                />
                                {/* Mattress/blanket */}
                                <path
                                    d="M25 50 L95 50 L95 60 L25 60 Z"
                                    fill="#F97316"
                                    stroke="#EA580C"
                                    strokeWidth="1.5"
                                />
                                {/* Pillow */}
                                <rect
                                    x="70"
                                    y="40"
                                    width="20"
                                    height="12"
                                    rx="2"
                                    fill="#D1D5DB"
                                    stroke="#9CA3AF"
                                    strokeWidth="1.5"
                                />
                                {/* Bed legs */}
                                <line x1="25" y1="75" x2="25" y2="85" stroke="#9CA3AF" strokeWidth="2" />
                                <line x1="95" y1="75" x2="95" y2="85" stroke="#9CA3AF" strokeWidth="2" />
                            </svg>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-6 py-2 border border-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        {totalPhotos === 0 ? t('host.editor.addPhotos', 'Add photos') : t('host.photos.addMorePhotos', 'Add more photos')}
                    </button>

                    {pendingPhotos.length > 0 && (
                        <p className="text-sm text-gray-500 mt-3">
                            {pendingPhotos.length} {pendingPhotos.length !== 1 ? t('host.photos.photosPlural', 'photos') : t('host.photos.photoSingular', 'photo')} {t('host.photos.readyToUpload', 'ready to upload')}
                        </p>
                    )}
                </div>

                {/* Save Button */}
                {pendingPhotos.length > 0 && (
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                pendingPhotos.forEach(p => URL.revokeObjectURL(p.preview));
                                setPendingPhotos([]);
                            }}
                            disabled={uploading}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={uploading}
                            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {uploading ? t('common.saving', 'Saving...') : t('common.savePhotosCount', 'Save {{count}} {{unit}}', { count: pendingPhotos.length, unit: pendingPhotos.length !== 1 ? t('host.photos.photosPlural', 'photos') : t('host.photos.photoSingular', 'photo') })}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BedroomEditor;
