export interface ProcessResult {
    id: string;
    success: boolean;
    error?: string;
    result?: unknown;
}

export interface BatchResult {
    message: string;
    processed: number;
    succeeded: number;
    failed: number;
    results: ProcessResult[];
}
