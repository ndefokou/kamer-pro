import React, { useState, useRef } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/api/client';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';

interface PhotoUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    roomType: string;
    onPhotoAdded: (photoUrl: string) => void;
    existingPhotos?: { id: string; url: string; caption: string }[];
}

type ModalView = 'options' | 'upload' | 'gallery';

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
    isOpen,
    onClose,
    listingId,
    roomType,
    onPhotoAdded,
    existingPhotos = []
}) => {
    const [view, setView] = useState<ModalView>('options');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedExistingPhotos, setSelectedExistingPhotos] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (files: FileList | null) => {
        if (files) {
            setSelectedFiles(Array.from(files));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files);
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);

                const response = await apiClient.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                // Add photo to listing
                await apiClient.post(`/listings/${listingId}/photos`, {
                    url: response.data.url,
                    caption: `${roomType} photo`,
                    room_type: roomType
                });

                onPhotoAdded(response.data.url);
            }

            setSelectedFiles([]);
            onClose();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveExistingPhotos = async () => {
        try {
            for (const photoId of selectedExistingPhotos) {
                const photo = existingPhotos.find(p => p.id === photoId);
                if (photo) {
                    await apiClient.post(`/listings/${listingId}/photos`, {
                        url: photo.url,
                        caption: `${roomType} photo`,
                        room_type: roomType
                    });
                    onPhotoAdded(photo.url);
                }
            }
            onClose();
        } catch (error) {
            console.error('Failed to add photos:', error);
        }
    };

    const toggleExistingPhoto = (photoId: string) => {
        setSelectedExistingPhotos(prev =>
            prev.includes(photoId)
                ? prev.filter(id => id !== photoId)
                : [...prev, photoId]
        );
    };

    const renderOptionsView = () => (
        <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
                <div className="w-9" />
            </div>

            <div className="p-6">
                <button
                    onClick={() => setView('upload')}
                    className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between mb-4"
                >
                    <span className="font-medium text-gray-900">Upload from your device</span>
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button
                    onClick={() => setView('gallery')}
                    className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between"
                >
                    <span className="font-medium text-gray-900">Choose from Additional photos</span>
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );

    const renderUploadView = () => (
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <button
                    onClick={() => setView('options')}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">Upload photos</h2>
                    <span className="text-sm text-gray-500">
                        {selectedFiles.length > 0 ? `${selectedFiles.length} selected` : 'No items selected'}
                    </span>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center"
                >
                    <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold mb-2">Drag and drop</h3>
                    <p className="text-gray-500 mb-4">or browse for photos</p>
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6"
                    >
                        Browse
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                    />
                </div>

                {selectedFiles.length > 0 && (
                    <div className="mt-6">
                        <h4 className="font-semibold mb-4">Selected files:</h4>
                        <div className="space-y-2">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm">{file.name}</span>
                                    <button
                                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                <button
                    onClick={() => setView('options')}
                    className="text-base font-medium text-gray-900 hover:underline"
                >
                    Done
                </button>
                <Button
                    onClick={handleUpload}
                    disabled={selectedFiles.length === 0 || uploading}
                    className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6 disabled:opacity-50"
                >
                    {uploading ? 'Uploading...' : 'Upload'}
                </Button>
            </div>
        </div>
    );

    const renderGalleryView = () => (
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <button
                    onClick={() => setView('options')}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold">{roomType}</h2>
                <div className="w-9" />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-xl font-semibold mb-6">Add any of these photos?</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {existingPhotos.map((photo) => {
                        const isSelected = selectedExistingPhotos.includes(photo.id);
                        return (
                            <button
                                key={photo.id}
                                onClick={() => toggleExistingPhoto(photo.id)}
                                className={`aspect-square rounded-lg overflow-hidden border-4 transition-all ${isSelected ? 'border-blue-500' : 'border-transparent'
                                    }`}
                            >
                                <OptimizedImage
                                    src={getImageUrl(photo.url)}
                                    alt={photo.caption}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                <button
                    onClick={() => setView('options')}
                    className="text-base font-medium text-gray-900 hover:underline"
                >
                    Cancel
                </button>
                <Button
                    onClick={handleSaveExistingPhotos}
                    disabled={selectedExistingPhotos.length === 0}
                    className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6 disabled:opacity-50"
                >
                    Save
                </Button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            {view === 'options' && renderOptionsView()}
            {view === 'upload' && renderUploadView()}
            {view === 'gallery' && renderGalleryView()}
        </div>
    );
};

export default PhotoUploadModal;
