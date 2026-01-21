/**
 * Utility for executing a function with exponential backoff retry.
 */

export interface RetryOptions {
    maxAttempts: number;
    initialDelayMs: number;
    backoffFactor: number;
    retryableErrors?: (error: unknown) => boolean;
}

const defaultOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffFactor: 2,
};

/**
 * Executes a function with retries using exponential backoff.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const { maxAttempts, initialDelayMs, backoffFactor, retryableErrors } = {
        ...defaultOptions,
        ...options,
    };

    let lastError: unknown;
    let delay = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable
            if (retryableErrors && !retryableErrors(error)) {
                throw error;
            }

            if (attempt === maxAttempts) {
                break;
            }

            console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`, error instanceof Error ? error.message : String(error));
            
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= backoffFactor;
        }
    }

    throw lastError;
}
