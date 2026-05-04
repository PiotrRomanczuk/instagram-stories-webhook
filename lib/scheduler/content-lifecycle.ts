import type { ContentItem } from '@/lib/types';

/**
 * Seam between the publishing orchestrator and the content_items state machine.
 *
 * The orchestrator (process-service) drives a flow; this interface exposes
 * exactly the lifecycle transitions and queries it needs. Two adapters satisfy
 * it: the production Supabase adapter in lib/content-db/processing.ts, and an
 * in-memory fake (below) used by orchestrator tests.
 */
export interface ContentLifecycle {
    getPendingItems(maxItems: number): Promise<ContentItem[]>;
    countUpcomingItems(maxTime: number): Promise<number>;
    getItemForProcessing(id: string): Promise<ContentItem | null>;
    acquireLock(id: string): Promise<boolean>;
    markPublished(id: string, igMediaId: string, contentHash?: string): Promise<boolean>;
    markFailed(id: string, errorMessage: string, retryCount?: number): Promise<boolean>;
    markCancelled(id: string, reason: string): Promise<boolean>;
    markStoryProcessingComplete(id: string): Promise<void>;
    markStoryProcessingFailed(id: string, error: string): Promise<void>;
    recoverStaleLocks(): Promise<number>;
    expireOverdueContent(): Promise<number>;
}

interface FakeRecord {
    item: ContentItem;
    locked: boolean;
}

export interface InMemoryLifecycleEvent {
    op:
        | 'acquireLock'
        | 'markPublished'
        | 'markFailed'
        | 'markCancelled'
        | 'markStoryProcessingComplete'
        | 'markStoryProcessingFailed';
    id: string;
    payload?: Record<string, unknown>;
}

/**
 * In-memory ContentLifecycle for orchestrator tests. Records every transition
 * call in `events` so tests can assert ordering and arguments.
 */
export class InMemoryContentLifecycle implements ContentLifecycle {
    private records = new Map<string, FakeRecord>();
    public events: InMemoryLifecycleEvent[] = [];

    seed(items: ContentItem[]): void {
        for (const item of items) {
            this.records.set(item.id, { item, locked: false });
        }
    }

    snapshot(id: string): ContentItem | undefined {
        return this.records.get(id)?.item;
    }

    async getPendingItems(maxItems: number): Promise<ContentItem[]> {
        return Array.from(this.records.values())
            .filter((r) => r.item.publishingStatus === 'scheduled')
            .map((r) => r.item)
            .slice(0, maxItems);
    }

    async countUpcomingItems(maxTime: number): Promise<number> {
        const now = Date.now();
        return Array.from(this.records.values()).filter(
            (r) =>
                r.item.publishingStatus === 'scheduled' &&
                r.item.scheduledTime !== undefined &&
                r.item.scheduledTime > now &&
                r.item.scheduledTime <= maxTime,
        ).length;
    }

    async getItemForProcessing(id: string): Promise<ContentItem | null> {
        const rec = this.records.get(id);
        if (!rec) return null;
        if (rec.item.publishingStatus !== 'scheduled' && rec.item.publishingStatus !== 'processing') {
            return null;
        }
        return rec.item;
    }

    async acquireLock(id: string): Promise<boolean> {
        const rec = this.records.get(id);
        if (!rec || rec.locked) return false;
        rec.locked = true;
        rec.item = { ...rec.item, publishingStatus: 'processing' };
        this.events.push({ op: 'acquireLock', id });
        return true;
    }

    async markPublished(id: string, igMediaId: string, contentHash?: string): Promise<boolean> {
        const rec = this.records.get(id);
        if (!rec) return false;
        rec.locked = false;
        rec.item = {
            ...rec.item,
            publishingStatus: 'published',
            igMediaId,
            contentHash: contentHash ?? rec.item.contentHash,
        };
        this.events.push({ op: 'markPublished', id, payload: { igMediaId, contentHash } });
        return true;
    }

    async markFailed(id: string, errorMessage: string, retryCount?: number): Promise<boolean> {
        const rec = this.records.get(id);
        if (!rec) return false;
        rec.locked = false;
        const terminal = retryCount !== undefined && retryCount >= 3;
        rec.item = {
            ...rec.item,
            publishingStatus: terminal ? 'failed' : 'scheduled',
            error: errorMessage,
            retryCount: retryCount ?? rec.item.retryCount,
        };
        this.events.push({ op: 'markFailed', id, payload: { errorMessage, retryCount } });
        return true;
    }

    async markCancelled(id: string, reason: string): Promise<boolean> {
        const rec = this.records.get(id);
        if (!rec) return false;
        rec.locked = false;
        rec.item = { ...rec.item, publishingStatus: 'failed', error: reason };
        this.events.push({ op: 'markCancelled', id, payload: { reason } });
        return true;
    }

    async markStoryProcessingComplete(id: string): Promise<void> {
        const rec = this.records.get(id);
        if (!rec) return;
        rec.item = { ...rec.item, storyReady: true };
        this.events.push({ op: 'markStoryProcessingComplete', id });
    }

    async markStoryProcessingFailed(id: string, error: string): Promise<void> {
        this.events.push({ op: 'markStoryProcessingFailed', id, payload: { error } });
    }

    async recoverStaleLocks(): Promise<number> {
        return 0;
    }

    async expireOverdueContent(): Promise<number> {
        return 0;
    }
}
