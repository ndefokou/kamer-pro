import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import apiClient from '@/api/client';
import { getImageUrl } from '@/lib/utils';

interface BathroomPhoto {
    id: string;
    url: string;
    caption: string;
}

interface PendingPhoto {
    file: File;
    preview: string;
}

const BathroomEditor: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [bathroomPhotos, setBathroomPhotos] = useState<BathroomPhoto[]>([]);
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

            // Filter bathroom photos
            const bathroom = listing.photos?.filter((p: any) =>
                p.caption?.toLowerCase().includes('bathroom') ||
                p.room_type === 'bathroom'
            ) || [];

            setBathroomPhotos(bathroom);
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
                caption: 'Bathroom photo',
                room_type: 'bathroom',
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

    const totalPhotos = bathroomPhotos.length + pendingPhotos.length;

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
                    <h2 className="text-lg font-semibold">Bathroom</h2>
                    <div className="w-10" />
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-semibold mb-2">Bathroom photos</h1>
                <p className="text-gray-500 mb-8">
                    Add photos of your bathroom. You can select multiple photos at once.
                </p>

                {/* Photo Grid */}
                {totalPhotos > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        {/* Existing photos */}
                        {bathroomPhotos.map((photo) => (
                            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                                <img
                                    src={getImageUrl(photo.url)}
                                    alt={photo.caption}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}

                        {/* Pending photos */}
                        {pendingPhotos.map((photo, index) => (
                            <div key={`pending-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-500">
                                <img
                                    src={photo.preview}
                                    alt="Pending upload"
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={() => removePendingPhoto(index)}
                                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                                    New
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white mb-6">
                    {totalPhotos === 0 && (
                        <div className="mb-6">
                            {/* Bathroom icon */}
                            <svg
                                className="h-32 w-32 mx-auto mb-6"
                                viewBox="0 0 120 100"
                                fill="none"
                            >
                                {/* Bathtub base */}
                                <rect
                                    x="20"
                                    y="50"
                                    width="80"
                                    height="30"
                                    rx="4"
                                    fill="#E5E7EB"
                                    stroke="#9CA3AF"
                                    strokeWidth="1.5"
                                />
                                {/* Water */}
                                <rect
                                    x="25"
                                    y="55"
                                    width="70"
                                    height="15"
                                    rx="2"
                                    fill="#60A5FA"
                                    opacity="0.6"
                                />
                                {/* Faucet */}
                                <circle
                                    cx="30"
                                    cy="45"
                                    r="3"
                                    fill="#9CA3AF"
                                />
                                <rect
                                    x="28"
                                    y="35"
                                    width="4"
                                    height="10"
                                    fill="#9CA3AF"
                                />
                                {/* Bathtub feet */}
                                <ellipse cx="30" cy="82" rx="4" ry="2" fill="#6B7280" />
                                <ellipse cx="90" cy="82" rx="4" ry="2" fill="#6B7280" />
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
                        {totalPhotos === 0 ? 'Add photos' : 'Add more photos'}
                    </button>

                    {pendingPhotos.length > 0 && (
                        <p className="text-sm text-gray-500 mt-3">
                            {pendingPhotos.length} photo{pendingPhotos.length !== 1 ? 's' : ''} ready to upload
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
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={uploading}
                            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {uploading ? 'Saving...' : `Save ${pendingPhotos.length} photo${pendingPhotos.length !== 1 ? 's' : ''}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BathroomEditor;
