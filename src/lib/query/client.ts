import { QueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';

export const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                enabled: browser,
                staleTime: 60 * 1000, // 1 minute
                retry: 3,
                retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
            },
            mutations: {
                retry: 1
            }
        }
    });
