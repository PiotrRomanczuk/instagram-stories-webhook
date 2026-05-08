export interface ProcessResult {
    id: string;
    success: boolean;
    error?: string;
    result?: unknown;
}

export interface QuotaInfo {
    quotaTotal: number;
    quotaUsage: number;
    quotaRemaining: number;
}

export interface BatchResult {
    message: string;
    /** Number of items the batch attempted to publish (= results.length, excludes skipped). */
    processed: number;
    /** Items that successfully reached Instagram. */
    succeeded: number;
    /** Total failures (= failedRetryable + failedTerminal). Kept for backward compatibility. */
    failed: number;
    failedRetryable: number;
    failedTerminal: number;
    /** Items skipped because another worker held the processing lock. */
    skippedLocked: number;
    /** Items skipped because their content hash matched a recent publish. */
    skippedDuplicate: number;
    /** Items skipped because their status moved out of 'scheduled' between fetch and lock. */
    skippedStale: number;
    results: ProcessResult[];
    quotaInfo?: QuotaInfo;
}
