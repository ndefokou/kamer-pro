import { dbService } from './dbService';
import { networkService } from './networkService';

interface QueuedRequest {
    id: string;
    url: string;
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    data: any;
    headers?: Record<string, string>;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
}

const QUEUE_STORE_KEY = 'request_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

class RequestQueueService {
    private queue: QueuedRequest[] = [];
    private processing = false;
    private listeners: Set<(queue: QueuedRequest[]) => void> = new Set();

    constructor() {
        this.loadQueue();
        this.setupNetworkListener();
    }

    private async loadQueue(): Promise<void> {
        try {
            const stored = localStorage.getItem(QUEUE_STORE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
                console.log(`Loaded ${this.queue.length} queued requests`);
            }
        } catch (error) {
            console.error('Failed to load request queue:', error);
            this.queue = [];
        }
    }

    private saveQueue(): void {
        try {
            localStorage.setItem(QUEUE_STORE_KEY, JSON.stringify(this.queue));
            this.notifyListeners();
        } catch (error) {
            console.error('Failed to save request queue:', error);
        }
    }

    private setupNetworkListener(): void {
        networkService.subscribe((info) => {
            if (info.isOnline && this.queue.length > 0 && !this.processing) {
                console.log('Network restored, processing queued requests...');
                this.processQueue();
            }
        });
    }

    /**
     * Add a failed request to the queue
     */
    enqueue(
        url: string,
        method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        data: any,
        headers?: Record<string, string>,
        maxRetries: number = MAX_RETRIES
    ): string {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const request: QueuedRequest = {
            id,
            url,
            method,
            data,
            headers,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries,
        };

        this.queue.push(request);
        this.saveQueue();

        console.log(`Request queued: ${method} ${url}`);

        // Try to process immediately if online
        if (navigator.onLine && !this.processing) {
            this.processQueue();
        }

        return id;
    }

    /**
     * Remove a request from the queue
     */
    dequeue(id: string): boolean {
        const index = this.queue.findIndex(req => req.id === id);
        if (index !== -1) {
            this.queue.splice(index, 1);
            this.saveQueue();
            return true;
        }
        return false;
    }

    /**
     * Get all queued requests
     */
    getQueue(): QueuedRequest[] {
        return [...this.queue];
    }

    /**
     * Clear all queued requests
     */
    clearQueue(): void {
        this.queue = [];
        this.saveQueue();
    }

    /**
     * Process all queued requests
     */
    async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        if (!navigator.onLine) {
            console.log('Cannot process queue: offline');
            return;
        }

        this.processing = true;
        console.log(`Processing ${this.queue.length} queued requests...`);

        const results = {
            success: 0,
            failed: 0,
            retrying: 0,
        };

        // Process requests one by one
        while (this.queue.length > 0) {
            const request = this.queue[0];

            try {
                await this.executeRequest(request);

                // Success - remove from queue
                this.queue.shift();
                results.success++;
                console.log(`✓ Request succeeded: ${request.method} ${request.url}`);

            } catch (error) {
                console.error(`✗ Request failed: ${request.method} ${request.url}`, error);

                request.retryCount++;

                if (request.retryCount >= request.maxRetries) {
                    // Max retries reached - remove from queue
                    this.queue.shift();
                    results.failed++;
                    console.log(`✗ Max retries reached for: ${request.method} ${request.url}`);
                } else {
                    // Will retry later
                    results.retrying++;
                    console.log(`↻ Will retry (${request.retryCount}/${request.maxRetries}): ${request.method} ${request.url}`);

                    // Move to end of queue
                    this.queue.push(this.queue.shift()!);

                    // Wait before next attempt
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }

            this.saveQueue();
        }

        this.processing = false;

        console.log('Queue processing complete:', results);

        if (results.success > 0) {
            this.notifySuccess(results.success);
        }
    }

    private async executeRequest(request: QueuedRequest): Promise<void> {
        const response = await fetch(request.url, {
            method: request.method,
            headers: {
                'Content-Type': 'application/json',
                ...request.headers,
            },
            body: JSON.stringify(request.data),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    private notifySuccess(count: number): void {
        // You can integrate with your toast/notification system here
        console.log(`✓ ${count} queued request(s) completed successfully`);
    }

    /**
     * Subscribe to queue changes
     */
    subscribe(callback: (queue: QueuedRequest[]) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(): void {
        this.listeners.forEach(callback => callback(this.getQueue()));
    }

    /**
     * Get queue statistics
     */
    getStats(): {
        total: number;
        byMethod: Record<string, number>;
        oldestTimestamp: number | null;
    } {
        const byMethod: Record<string, number> = {};
        let oldestTimestamp: number | null = null;

        this.queue.forEach(req => {
            byMethod[req.method] = (byMethod[req.method] || 0) + 1;
            if (!oldestTimestamp || req.timestamp < oldestTimestamp) {
                oldestTimestamp = req.timestamp;
            }
        });

        return {
            total: this.queue.length,
            byMethod,
            oldestTimestamp,
        };
    }
}

// Export singleton instance
export const requestQueue = new RequestQueueService();

// React hook for using request queue
import { useState, useEffect } from 'react';

export function useRequestQueue() {
    const [queue, setQueue] = useState<QueuedRequest[]>(requestQueue.getQueue());
    const [stats, setStats] = useState(requestQueue.getStats());

    useEffect(() => {
        const unsubscribe = requestQueue.subscribe((newQueue) => {
            setQueue(newQueue);
            setStats(requestQueue.getStats());
        });

        return unsubscribe;
    }, []);

    return {
        queue,
        stats,
        enqueue: requestQueue.enqueue.bind(requestQueue),
        dequeue: requestQueue.dequeue.bind(requestQueue),
        clearQueue: requestQueue.clearQueue.bind(requestQueue),
        processQueue: requestQueue.processQueue.bind(requestQueue),
    };
}

export default requestQueue;
