import React, { useState, useEffect, useRef } from 'react';
import { useConnectionQuality } from '../services/networkService';
import { dbService } from '../services/dbService';

interface OptimizedImageProps {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
    priority?: boolean; // Skip lazy loading for above-the-fold images
    quality?: 'low' | 'medium' | 'high';
    onLoad?: () => void;
    onError?: () => void;
    onClick?: React.MouseEventHandler<HTMLImageElement>;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    className = '',
    width,
    height,
    priority = false,
    quality,
    onLoad,
    onError,
    onClick,
}) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [blurDataUrl, setBlurDataUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const imgRef = useRef<HTMLImageElement>(null);
    const { recommendedImageQuality, isSlowConnection } = useConnectionQuality();

    // Determine image quality based on network
    const effectiveQuality = quality || recommendedImageQuality;

    // Generate tiny blur-up placeholder URL (< 1KB)
    const getBlurDataUrl = (originalUrl: string): string => {
        if (!originalUrl || originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
            return '';
        }

        try {
            const url = new URL(originalUrl, window.location.origin);
            url.searchParams.set('w', '20');
            url.searchParams.set('q', '10');
            url.searchParams.set('blur', '10');
            if (supportsWebP()) {
                url.searchParams.set('fm', 'webp');
            }
            return url.toString();
        } catch {
            return '';
        }
    };

    // Generate optimized image URL with responsive sizes
    const getOptimizedUrl = (originalUrl: string, targetQuality: string, targetWidth?: number): string => {
        if (!originalUrl) return '';

        // If it's already a data URL or blob, return as is
        if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
            return originalUrl;
        }

        // For external URLs, try to add quality parameters
        try {
            const url = new URL(originalUrl, window.location.origin);

            // Determine width based on quality and viewport
            let imageWidth = targetWidth;
            if (!imageWidth) {
                if (targetQuality === 'low') {
                    imageWidth = 400;
                } else if (targetQuality === 'medium') {
                    imageWidth = 800;
                } else {
                    imageWidth = 1200;
                }
            }

            // Add quality parameter based on network
            url.searchParams.set('w', imageWidth.toString());

            if (targetQuality === 'low') {
                url.searchParams.set('q', '30');
            } else if (targetQuality === 'medium') {
                url.searchParams.set('q', '60');
            } else {
                url.searchParams.set('q', '80');
            }

            // Request WebP format if supported
            if (supportsWebP()) {
                url.searchParams.set('fm', 'webp');
            }

            return url.toString();
        } catch {
            // If URL parsing fails, return original
            return originalUrl;
        }
    };

    // Generate srcset for responsive images
    const getSrcSet = (originalUrl: string, targetQuality: string): string => {
        if (!originalUrl || originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
            return '';
        }

        try {
            const sizes = targetQuality === 'low' ? [400, 600] : [400, 800, 1200];
            return sizes
                .map(size => `${getOptimizedUrl(originalUrl, targetQuality, size)} ${size}w`)
                .join(', ');
        } catch {
            return '';
        }
    };

    // Check WebP support
    const supportsWebP = (): boolean => {
        const canvas = document.createElement('canvas');
        if (canvas.getContext && canvas.getContext('2d')) {
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        }
        return false;
    };

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (priority || !imgRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '50px', // Start loading 50px before image enters viewport
                threshold: 0.01,
            }
        );

        observer.observe(imgRef.current);

        return () => {
            observer.disconnect();
        };
    }, [priority]);

    // Load blur placeholder first, then full image
    useEffect(() => {
        if (!isInView || !src) return;

        let isMounted = true;

        const loadImage = async () => {
            try {
                setIsLoading(true);
                setHasError(false);

                // Step 1: Load tiny blur placeholder immediately
                const blurUrl = getBlurDataUrl(src);
                if (blurUrl && isMounted) {
                    setBlurDataUrl(blurUrl);
                }

                // Step 2: Try to get from cache first
                const cachedBlob = await dbService.getCachedImage(src);

                if (cachedBlob && isMounted) {
                    const objectUrl = URL.createObjectURL(cachedBlob);
                    setImageSrc(objectUrl);
                    setIsLoading(false);
                    onLoad?.();
                    return;
                }

                // Step 3: Load from network with optimized quality
                const optimizedUrl = getOptimizedUrl(src, effectiveQuality);

                // Fetch image
                const response = await fetch(optimizedUrl);
                if (!response.ok) throw new Error('Failed to load image');

                const blob = await response.blob();

                // Cache the image
                await dbService.cacheImage(src, blob);

                if (isMounted) {
                    const objectUrl = URL.createObjectURL(blob);
                    setImageSrc(objectUrl);
                    setIsLoading(false);
                    onLoad?.();
                }
            } catch (error) {
                console.error('Error loading image:', error);
                if (isMounted) {
                    // Fallback to direct URL
                    setImageSrc(src);
                    setHasError(true);
                    setIsLoading(false);
                    onError?.();
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
            // Clean up object URL
            if (imageSrc && imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [isInView, src, effectiveQuality]);

    // Placeholder styles with blur effect
    const placeholderStyle: React.CSSProperties = {
        backgroundColor: '#e5e7eb',
        backgroundImage: blurDataUrl
            ? `url(${blurDataUrl})`
            : isLoading
                ? 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)'
                : undefined,
        backgroundSize: blurDataUrl ? 'cover' : isLoading ? '200% 100%' : undefined,
        backgroundPosition: 'center',
        filter: blurDataUrl && isLoading ? 'blur(10px)' : undefined,
        animation: !blurDataUrl && isLoading ? 'shimmer 1.5s infinite' : undefined,
        transition: 'filter 0.3s ease-out',
    };

    const srcSet = getSrcSet(src, effectiveQuality);

    return (
        <>
            <style>
                {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
            </style>
            <img
                ref={imgRef}
                src={imageSrc || blurDataUrl || undefined}
                srcSet={imageSrc && srcSet ? srcSet : undefined}
                sizes={imageSrc ? "(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px" : undefined}
                alt={alt}
                className={className}
                width={width}
                height={height}
                loading={priority ? 'eager' : 'lazy'}
                style={!imageSrc || isLoading ? placeholderStyle : { transition: 'opacity 0.3s ease-in' }}
                onClick={onClick}
                onLoad={() => {
                    setIsLoading(false);
                }}
                onError={() => {
                    setHasError(true);
                    setIsLoading(false);
                    onError?.();
                }}
            />
        </>
    );
};

export default OptimizedImage;
