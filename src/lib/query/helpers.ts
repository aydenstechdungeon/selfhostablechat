import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { err, ok, type Result } from 'neverthrow';

// Example query factory using neverthrow for error handling
export const createSafeQuery = <TData, TError = Error>(
    queryFn: () => Promise<Result<TData, TError>>,
    options: Omit<CreateQueryOptions<TData, TError>, 'queryFn'>
) => {
    return createQuery(() => ({
        ...options,
        queryFn: async () => {
            const result = await queryFn();

            if (result.isErr()) {
                throw result.error;
            }

            return result.value;
        }
    }));
};

// Example usage helper
export const exampleQuery = () =>
    createSafeQuery(
        async () => {
            try {
                const response = await fetch('/api/example');

                if (!response.ok) {
                    return err(new Error(`HTTP ${response.status}`));
                }

                const data = await response.json();
                return ok(data);
            } catch (error) {
                return err(error instanceof Error ? error : new Error('Unknown error'));
            }
        },
        {
            queryKey: ['example']
        }
    );
