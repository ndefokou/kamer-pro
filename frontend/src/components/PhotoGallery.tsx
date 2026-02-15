import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Share, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from './OptimizedImage';

interface Photo {
    id: number;
    url: string;
    is_cover?: number | boolean;
}

interface PhotoGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    photos: Photo[];
    initialPhotoIndex?: number;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ isOpen, onClose, photos, initialPhotoIndex = 0 }) => {
    const [view, setView] = useState<'grid' | 'lightbox'>('grid');
    const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Let's stick to the plan: "Show all photos" -> Grid.
        } else {
            document.body.style.overflow = 'unset';
            setView('grid');
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        setCurrentIndex(initialPhotoIndex);
        if (initialPhotoIndex > 0) {
            // If opened with a specific photo index (e.g. from preview click), maybe we should go straight to lightbox?
            // The prompt says "click on show all photos, it should show photos like this [grid]... click on a picture and it show like this [lightbox]".
            // So initial open is usually grid.
        }
    }, [initialPhotoIndex]);

    if (!isOpen) return null;

    const handlePhotoClick = (index: number) => {
        setCurrentIndex(index);
        setView('lightbox');
    };

    const nextPhoto = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    if (view === 'lightbox') {
        return (
            <div className="fixed inset-0 z-[60] bg-black flex flex-col">
                {/* Lightbox Header */}
                <div className="flex items-center justify-between px-4 py-4 text-white">
                    <Button
                        variant="ghost"
                        className="text-white hover:bg-white/10 gap-2"
                        onClick={() => setView('grid')}
                    >
                        <ChevronLeft className="h-5 w-5" />
                        Back to grid
                    </Button>
                    <div className="text-sm font-medium">
                        {currentIndex + 1} / {photos.length}
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                            <Share className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                            <Heart className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 relative flex items-center justify-center group">
                    <button
                        className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={prevPhoto}
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </button>

                    <OptimizedImage
                        src={getImageUrl(photos[currentIndex].url)}
                        alt={`Photo ${currentIndex + 1}`}
                        className="w-full h-full object-contain"
                        quality="high"
                        priority={true}
                    />

                    <button
                        className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={nextPhoto}
                    >
                        <ChevronRight className="h-8 w-8" />
                    </button>
                </div>

                {/* Thumbnail Strip (Optional, but nice for "continue to swap") */}
                <div className="h-20 bg-black/90 flex items-center justify-center gap-2 px-4 overflow-x-auto">
                    {photos.map((photo, idx) => (
                        <button
                            key={photo.id}
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative h-14 w-20 flex-shrink-0 rounded-md overflow-hidden transition-opacity ${idx === currentIndex ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-75'
                                }`}
                        >
                            <OptimizedImage
                                src={getImageUrl(photo.url)}
                                alt={`Thumbnail ${idx + 1}`}
                                className="h-full w-full object-cover"
                                quality="low"
                            />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Grid View
    return (
        <div className="fixed inset-0 z-[60] bg-white animate-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b px-4 h-16 flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 rounded-full"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <Share className="h-4 w-4" />
                        Share
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                        <Heart className="h-4 w-4" />
                        Save
                    </Button>
                </div>
            </div>

            {/* Grid Content */}
            <div className="max-w-7xl mx-auto px-4 py-8 overflow-y-auto h-[calc(100vh-64px)]">
                <h2 className="text-2xl font-bold mb-6">Photo tour</h2>
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                    {photos.map((photo, index) => (
                        <div
                            key={photo.id}
                            className="break-inside-avoid cursor-pointer group relative"
                            onClick={() => handlePhotoClick(index)}
                        >
                            <OptimizedImage
                                src={getImageUrl(photo.url)}
                                alt={`Photo ${index + 1}`}
                                className="w-full rounded-lg hover:opacity-95 transition-opacity"
                                quality="low"
                                priority={index < 6}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PhotoGallery;
