import { QueryClient } from "@tanstack/react-query";
import { networkService } from "@/services/networkService";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 120000,
            gcTime: 600000,
            refetchOnWindowFocus: false,
            retry: (failureCount, _error) => {
                try {
                    const q = networkService.getCurrentInfo().quality;
                    const max = q === 'poor' ? 0 : q === 'moderate' ? 1 : 2;
                    return failureCount < max;
                } catch {
                    return failureCount < 2;
                }
            },
            retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 3000),
        },
    },
});
