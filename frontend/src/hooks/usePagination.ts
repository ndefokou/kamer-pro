import { useState, useEffect, useCallback } from 'react';
import { useConnectionQuality } from '../services/networkService';

interface UsePaginationOptions {
    initialPage?: number;
    initialPageSize?: number;
    adaptivePageSize?: boolean; // Adjust page size based on network quality
}

interface PaginationState {
    page: number;
    pageSize: number;
    offset: number;
    hasMore: boolean;
}

interface PaginationControls {
    page: number;
    pageSize: number;
    offset: number;
    hasMore: boolean;
    nextPage: () => void;
    prevPage: () => void;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
    setHasMore: (hasMore: boolean) => void;
    reset: () => void;
}

export function usePagination(options: UsePaginationOptions = {}): PaginationControls {
    const {
        initialPage = 0,
        initialPageSize = 20,
        adaptivePageSize = true,
    } = options;

    const { recommendedPageSize } = useConnectionQuality();

    const [state, setState] = useState<PaginationState>({
        page: initialPage,
        pageSize: adaptivePageSize ? recommendedPageSize : initialPageSize,
        offset: initialPage * (adaptivePageSize ? recommendedPageSize : initialPageSize),
        hasMore: true,
    });

    // Update page size when network quality changes (if adaptive)
    useEffect(() => {
        if (adaptivePageSize) {
            setState(prev => ({
                ...prev,
                pageSize: recommendedPageSize,
                offset: prev.page * recommendedPageSize,
            }));
        }
    }, [recommendedPageSize, adaptivePageSize]);

    const nextPage = useCallback(() => {
        setState(prev => {
            const newPage = prev.page + 1;
            return {
                ...prev,
                page: newPage,
                offset: newPage * prev.pageSize,
            };
        });
    }, []);

    const prevPage = useCallback(() => {
        setState(prev => {
            const newPage = Math.max(0, prev.page - 1);
            return {
                ...prev,
                page: newPage,
                offset: newPage * prev.pageSize,
            };
        });
    }, []);

    const setPage = useCallback((page: number) => {
        setState(prev => ({
            ...prev,
            page,
            offset: page * prev.pageSize,
        }));
    }, []);

    const setPageSize = useCallback((size: number) => {
        setState(prev => ({
            ...prev,
            pageSize: size,
            offset: prev.page * size,
        }));
    }, []);

    const setHasMore = useCallback((hasMore: boolean) => {
        setState(prev => ({
            ...prev,
            hasMore,
        }));
    }, []);

    const reset = useCallback(() => {
        setState({
            page: initialPage,
            pageSize: adaptivePageSize ? recommendedPageSize : initialPageSize,
            offset: initialPage * (adaptivePageSize ? recommendedPageSize : initialPageSize),
            hasMore: true,
        });
    }, [initialPage, initialPageSize, adaptivePageSize, recommendedPageSize]);

    return {
        page: state.page,
        pageSize: state.pageSize,
        offset: state.offset,
        hasMore: state.hasMore,
        nextPage,
        prevPage,
        setPage,
        setPageSize,
        setHasMore,
        reset,
    };
}

// Infinite scroll hook with intersection observer
interface UseInfiniteScrollOptions {
    onLoadMore: () => void | Promise<void>;
    hasMore: boolean;
    isLoading: boolean;
    threshold?: number;
    rootMargin?: string;
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
    const {
        onLoadMore,
        hasMore,
        isLoading,
        threshold = 0.5,
        rootMargin = '100px',
    } = options;

    const [observerTarget, setObserverTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!observerTarget || !hasMore || isLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(observerTarget);

        return () => {
            observer.disconnect();
        };
    }, [observerTarget, hasMore, isLoading, onLoadMore, threshold, rootMargin]);

    return { setObserverTarget };
}

// Batch request utility
interface BatchRequestOptions {
    maxBatchSize?: number;
    debounceMs?: number;
}

export class BatchRequestManager<T, R> {
    private queue: Array<{ data: T; resolve: (value: R) => void; reject: (error: Error | string | unknown) => void }> = [];
    private timer: NodeJS.Timeout | null = null;
    private maxBatchSize: number;
    private debounceMs: number;
    private processor: (batch: T[]) => Promise<R[]>;

    constructor(
        processor: (batch: T[]) => Promise<R[]>,
        options: BatchRequestOptions = {}
    ) {
        this.processor = processor;
        this.maxBatchSize = options.maxBatchSize || 10;
        this.debounceMs = options.debounceMs || 50;
    }

    add(data: T): Promise<R> {
        return new Promise((resolve, reject) => {
            this.queue.push({ data, resolve, reject });

            // Process immediately if batch is full
            if (this.queue.length >= this.maxBatchSize) {
                this.processBatch();
            } else {
                // Otherwise, debounce
                if (this.timer) {
                    clearTimeout(this.timer);
                }
                this.timer = setTimeout(() => this.processBatch(), this.debounceMs);
            }
        });
    }

    private async processBatch() {
        if (this.queue.length === 0) return;

        const batch = this.queue.splice(0, this.maxBatchSize);
        const dataItems = batch.map(item => item.data);

        try {
            const results = await this.processor(dataItems);

            batch.forEach((item, index) => {
                item.resolve(results[index]);
            });
        } catch (error) {
            batch.forEach(item => {
                item.reject(error);
            });
        }
    }

    clear() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.queue = [];
    }
}

export default usePagination;
