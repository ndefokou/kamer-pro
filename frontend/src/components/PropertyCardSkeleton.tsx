import React from 'react';

export const PropertyCardSkeleton = () => {
    return (
        <div className="block flex-shrink-0 w-full sm:w-[280px]">
            <div className="flex flex-col h-full animate-pulse">
                {/* Image Container Skeleton */}
                <div className="relative aspect-[20/19] sm:aspect-square rounded-xl overflow-hidden bg-gray-200 mb-3">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
                </div>

                {/* Property Info Skeleton */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-12 flex-shrink-0" />
                    </div>

                    <div className="h-3 bg-gray-200 rounded w-1/2" />

                    <div className="flex items-baseline gap-1 mt-1">
                        <div className="h-4 bg-gray-200 rounded w-20" />
                        <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PropertySectionSkeleton = ({ count = 4 }: { count?: number }) => {
    return (
        <div className="mb-4">
            {/* Title Skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
            </div>

            {/* Cards Skeleton */}
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-3">
                {Array.from({ length: count }).map((_, index) => (
                    <PropertyCardSkeleton key={index} />
                ))}
            </div>
        </div>
    );
};

export default PropertyCardSkeleton;
