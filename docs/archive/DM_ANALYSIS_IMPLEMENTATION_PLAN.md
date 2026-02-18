# DM Analysis Implementation Plan

**Created**: 2026-02-05
**Status**: Planning Phase
**Estimated Effort**: 40-50 hours total

---

## Executive Summary

This document outlines the implementation and testing plan for adding DM (Direct Message) analysis capabilities to the instagram-stories-webhook project. The goal is to analyze Instagram DM conversations for sentiment, intent, topics, and provide actionable analytics.

### Existing Infrastructure (Leveraged)

| Component | Status | Location |
|-----------|--------|----------|
| Instagram Messaging API | ✅ Complete | `lib/instagram/messages.ts` |
| Message Database Schema | ✅ Complete | `supabase/migrations/20260127010000_instagram_messaging.sql` |
| Type Definitions | ✅ Complete | `lib/types/messaging.ts` |
| Webhook Handler | ✅ Complete | `app/api/webhook/instagram/route.ts` |
| AI Analysis Pattern | ✅ Template exists | `lib/ai-analysis/meme-archiver.ts` |
| Inbox UI Components | ✅ Complete | `app/components/inbox/` |

### What Needs to Be Built

| Component | Priority | Effort |
|-----------|----------|--------|
| DM Analysis Database Schema | P0 | 2-3h |
| Analysis Types & Interfaces | P0 | 2h |
| DM Analyzer Core Library | P0 | 8-10h |
| Analysis API Endpoints | P1 | 6-8h |
| Analytics Dashboard | P2 | 10-12h |
| Batch Processing System | P2 | 4-5h |
| Comprehensive Tests | P0 | 10-12h |

---

## Phase 1: Database Schema & Types (Week 1)

### Task 1.1: Create DM Analysis Database Migration

**File**: `supabase/migrations/YYYYMMDDHHMMSS_dm_analysis.sql`

```sql
-- DM Analysis Results Table
CREATE TABLE dm_conversation_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,

    -- Analysis metadata
    messages_analyzed INT NOT NULL DEFAULT 0,
    analysis_period_start TIMESTAMPTZ,
    analysis_period_end TIMESTAMPTZ,

    -- Sentiment Analysis
    overall_sentiment VARCHAR(20) CHECK (overall_sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    sentiment_score DECIMAL(3,2), -- -1.00 to +1.00
    sentiment_breakdown JSONB, -- { positive: 0.6, neutral: 0.3, negative: 0.1 }

    -- Intent Classification
    primary_intent VARCHAR(50), -- support_request, feedback, inquiry, complaint, purchase_intent, general
    intent_confidence DECIMAL(3,2), -- 0.00 to 1.00
    detected_intents JSONB, -- Array of { intent: string, confidence: number, message_ids: string[] }

    -- Topic Extraction
    topics JSONB, -- Array of { topic: string, frequency: number, example_messages: string[] }
    keywords JSONB, -- Array of { keyword: string, count: number }

    -- Conversation Health
    avg_response_time_seconds INT,
    message_frequency_per_day DECIMAL(5,2),
    conversation_duration_hours INT,
    user_engagement_score DECIMAL(3,2), -- 0.00 to 1.00

    -- User Classification
    user_segment VARCHAR(50), -- high_value, engaged, at_risk, inactive, new

    -- Raw analysis data (for debugging/reprocessing)
    analysis_data JSONB,

    -- Status tracking
    analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_conversation_analysis UNIQUE (conversation_id)
);

-- Message-level analysis for granular insights
CREATE TABLE dm_message_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES instagram_messages(id) ON DELETE CASCADE,
    conversation_analysis_id UUID REFERENCES dm_conversation_analysis(id) ON DELETE CASCADE,

    -- Message-level sentiment
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    sentiment_score DECIMAL(3,2),

    -- Message-level intent
    intent VARCHAR(50),
    intent_confidence DECIMAL(3,2),

    -- Extracted entities
    entities JSONB, -- Array of { type: 'product'|'date'|'price'|etc, value: string }

    -- Language detection
    detected_language VARCHAR(10),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_message_analysis UNIQUE (message_id)
);

-- Analytics aggregation table (for dashboard performance)
CREATE TABLE dm_analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,

    -- Volume metrics
    total_conversations INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    new_conversations INT DEFAULT 0,

    -- Sentiment distribution
    positive_conversations INT DEFAULT 0,
    neutral_conversations INT DEFAULT 0,
    negative_conversations INT DEFAULT 0,

    -- Intent distribution
    support_requests INT DEFAULT 0,
    feedback_count INT DEFAULT 0,
    inquiries INT DEFAULT 0,
    complaints INT DEFAULT 0,

    -- Response metrics
    avg_response_time_seconds INT,
    response_rate DECIMAL(3,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_daily_analytics UNIQUE (user_id, date)
);

-- Indexes for query performance
CREATE INDEX idx_dm_analysis_user_id ON dm_conversation_analysis(user_id);
CREATE INDEX idx_dm_analysis_status ON dm_conversation_analysis(analysis_status);
CREATE INDEX idx_dm_analysis_sentiment ON dm_conversation_analysis(overall_sentiment);
CREATE INDEX idx_dm_analysis_intent ON dm_conversation_analysis(primary_intent);
CREATE INDEX idx_dm_analysis_created ON dm_conversation_analysis(created_at DESC);

CREATE INDEX idx_dm_message_analysis_conversation ON dm_message_analysis(conversation_analysis_id);
CREATE INDEX idx_dm_analytics_user_date ON dm_analytics_daily(user_id, date DESC);

-- RLS Policies
ALTER TABLE dm_conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_message_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analysis
CREATE POLICY "Users can view own conversation analysis"
    ON dm_conversation_analysis FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own message analysis"
    ON dm_message_analysis FOR SELECT
    USING (conversation_analysis_id IN (
        SELECT id FROM dm_conversation_analysis WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view own daily analytics"
    ON dm_analytics_daily FOR SELECT
    USING (user_id = auth.uid());

-- Service role can manage all
CREATE POLICY "Service role full access to conversation analysis"
    ON dm_conversation_analysis FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to message analysis"
    ON dm_message_analysis FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to daily analytics"
    ON dm_analytics_daily FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_dm_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dm_conversation_analysis_updated_at
    BEFORE UPDATE ON dm_conversation_analysis
    FOR EACH ROW EXECUTE FUNCTION update_dm_analysis_updated_at();
```

### Task 1.2: Create Type Definitions

**File**: `lib/types/dm-analysis.ts`

```typescript
// ============================================================================
// Analysis Result Types
// ============================================================================

export type SentimentType = 'positive' | 'neutral' | 'negative' | 'mixed';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type UserSegment = 'high_value' | 'engaged' | 'at_risk' | 'inactive' | 'new';
export type IntentType =
    | 'support_request'
    | 'feedback'
    | 'inquiry'
    | 'complaint'
    | 'purchase_intent'
    | 'general';

export interface SentimentBreakdown {
    positive: number;
    neutral: number;
    negative: number;
}

export interface DetectedIntent {
    intent: IntentType;
    confidence: number;
    messageIds: string[];
}

export interface ExtractedTopic {
    topic: string;
    frequency: number;
    exampleMessages: string[];
}

export interface ExtractedKeyword {
    keyword: string;
    count: number;
}

export interface ExtractedEntity {
    type: 'product' | 'date' | 'price' | 'location' | 'person' | 'other';
    value: string;
    messageId: string;
}

// ============================================================================
// Database Types (snake_case)
// ============================================================================

export interface DbConversationAnalysis {
    id: string;
    conversation_id: string;
    user_id: string;
    messages_analyzed: number;
    analysis_period_start: string | null;
    analysis_period_end: string | null;
    overall_sentiment: SentimentType | null;
    sentiment_score: number | null;
    sentiment_breakdown: SentimentBreakdown | null;
    primary_intent: IntentType | null;
    intent_confidence: number | null;
    detected_intents: DetectedIntent[] | null;
    topics: ExtractedTopic[] | null;
    keywords: ExtractedKeyword[] | null;
    avg_response_time_seconds: number | null;
    message_frequency_per_day: number | null;
    conversation_duration_hours: number | null;
    user_engagement_score: number | null;
    user_segment: UserSegment | null;
    analysis_data: Record<string, unknown> | null;
    analysis_status: AnalysisStatus;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    processed_at: string | null;
}

export interface DbMessageAnalysis {
    id: string;
    message_id: string;
    conversation_analysis_id: string | null;
    sentiment: Exclude<SentimentType, 'mixed'> | null;
    sentiment_score: number | null;
    intent: IntentType | null;
    intent_confidence: number | null;
    entities: ExtractedEntity[] | null;
    detected_language: string | null;
    created_at: string;
}

export interface DbDailyAnalytics {
    id: string;
    user_id: string;
    date: string;
    total_conversations: number;
    total_messages: number;
    new_conversations: number;
    positive_conversations: number;
    neutral_conversations: number;
    negative_conversations: number;
    support_requests: number;
    feedback_count: number;
    inquiries: number;
    complaints: number;
    avg_response_time_seconds: number | null;
    response_rate: number | null;
    created_at: string;
}

// ============================================================================
// Application Types (camelCase)
// ============================================================================

export interface ConversationAnalysis {
    id: string;
    conversationId: string;
    userId: string;
    messagesAnalyzed: number;
    analysisPeriodStart: Date | null;
    analysisPeriodEnd: Date | null;
    overallSentiment: SentimentType | null;
    sentimentScore: number | null;
    sentimentBreakdown: SentimentBreakdown | null;
    primaryIntent: IntentType | null;
    intentConfidence: number | null;
    detectedIntents: DetectedIntent[] | null;
    topics: ExtractedTopic[] | null;
    keywords: ExtractedKeyword[] | null;
    avgResponseTimeSeconds: number | null;
    messageFrequencyPerDay: number | null;
    conversationDurationHours: number | null;
    userEngagementScore: number | null;
    userSegment: UserSegment | null;
    analysisStatus: AnalysisStatus;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    processedAt: Date | null;
}

export interface MessageAnalysis {
    id: string;
    messageId: string;
    conversationAnalysisId: string | null;
    sentiment: Exclude<SentimentType, 'mixed'> | null;
    sentimentScore: number | null;
    intent: IntentType | null;
    intentConfidence: number | null;
    entities: ExtractedEntity[] | null;
    detectedLanguage: string | null;
    createdAt: Date;
}

export interface DailyAnalytics {
    id: string;
    userId: string;
    date: Date;
    totalConversations: number;
    totalMessages: number;
    newConversations: number;
    positiveConversations: number;
    neutralConversations: number;
    negativeConversations: number;
    supportRequests: number;
    feedbackCount: number;
    inquiries: number;
    complaints: number;
    avgResponseTimeSeconds: number | null;
    responseRate: number | null;
    createdAt: Date;
}

// ============================================================================
// Analysis Request/Response Types
// ============================================================================

export interface AnalyzeConversationRequest {
    conversationId: string;
    userId: string;
    options?: {
        includeMessageAnalysis?: boolean;
        maxMessages?: number;
        since?: Date;
    };
}

export interface AnalyzeConversationResponse {
    success: boolean;
    analysis: ConversationAnalysis | null;
    messageAnalyses?: MessageAnalysis[];
    error?: string;
}

export interface BatchAnalysisRequest {
    userId: string;
    conversationIds?: string[];
    analyzeAll?: boolean;
    options?: {
        includeMessageAnalysis?: boolean;
        maxConversations?: number;
    };
}

export interface BatchAnalysisResponse {
    success: boolean;
    total: number;
    processed: number;
    failed: number;
    results: Array<{
        conversationId: string;
        status: 'completed' | 'failed';
        error?: string;
    }>;
}

export interface AnalyticsSummary {
    period: 'day' | 'week' | 'month';
    startDate: Date;
    endDate: Date;
    totalConversations: number;
    totalMessages: number;
    sentimentDistribution: SentimentBreakdown;
    topIntents: Array<{ intent: IntentType; count: number }>;
    topTopics: ExtractedTopic[];
    avgResponseTime: number | null;
    engagementTrend: 'improving' | 'stable' | 'declining';
    userSegmentDistribution: Record<UserSegment, number>;
}

// ============================================================================
// Mapping Functions
// ============================================================================

export function mapConversationAnalysisRow(row: DbConversationAnalysis): ConversationAnalysis {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        messagesAnalyzed: row.messages_analyzed,
        analysisPeriodStart: row.analysis_period_start ? new Date(row.analysis_period_start) : null,
        analysisPeriodEnd: row.analysis_period_end ? new Date(row.analysis_period_end) : null,
        overallSentiment: row.overall_sentiment,
        sentimentScore: row.sentiment_score,
        sentimentBreakdown: row.sentiment_breakdown,
        primaryIntent: row.primary_intent,
        intentConfidence: row.intent_confidence,
        detectedIntents: row.detected_intents,
        topics: row.topics,
        keywords: row.keywords,
        avgResponseTimeSeconds: row.avg_response_time_seconds,
        messageFrequencyPerDay: row.message_frequency_per_day,
        conversationDurationHours: row.conversation_duration_hours,
        userEngagementScore: row.user_engagement_score,
        userSegment: row.user_segment,
        analysisStatus: row.analysis_status,
        errorMessage: row.error_message,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        processedAt: row.processed_at ? new Date(row.processed_at) : null,
    };
}

export function mapMessageAnalysisRow(row: DbMessageAnalysis): MessageAnalysis {
    return {
        id: row.id,
        messageId: row.message_id,
        conversationAnalysisId: row.conversation_analysis_id,
        sentiment: row.sentiment,
        sentimentScore: row.sentiment_score,
        intent: row.intent,
        intentConfidence: row.intent_confidence,
        entities: row.entities,
        detectedLanguage: row.detected_language,
        createdAt: new Date(row.created_at),
    };
}

export function mapDailyAnalyticsRow(row: DbDailyAnalytics): DailyAnalytics {
    return {
        id: row.id,
        userId: row.user_id,
        date: new Date(row.date),
        totalConversations: row.total_conversations,
        totalMessages: row.total_messages,
        newConversations: row.new_conversations,
        positiveConversations: row.positive_conversations,
        neutralConversations: row.neutral_conversations,
        negativeConversations: row.negative_conversations,
        supportRequests: row.support_requests,
        feedbackCount: row.feedback_count,
        inquiries: row.inquiries,
        complaints: row.complaints,
        avgResponseTimeSeconds: row.avg_response_time_seconds,
        responseRate: row.response_rate,
        createdAt: new Date(row.created_at),
    };
}
```

---

## Phase 2: Core Analysis Library (Week 2)

### Task 2.1: Create DM Analyzer Service

**File**: `lib/dm-analysis/analyzer.ts`

Core functionality:
- `analyzeConversation(conversationId, userId, options)` - Main entry point
- `analyzeMessage(message)` - Single message analysis
- `extractTopics(messages)` - Topic extraction from message collection
- `extractKeywords(messages)` - Keyword frequency analysis
- `calculateConversationHealth(messages)` - Response time, engagement metrics
- `classifyUserSegment(analysis)` - User segmentation based on patterns

### Task 2.2: Create Sentiment Analysis Module

**File**: `lib/dm-analysis/sentiment.ts`

```typescript
// Core functions to implement:
export async function analyzeSentiment(text: string): Promise<SentimentResult>;
export function aggregateSentiments(results: SentimentResult[]): SentimentBreakdown;
export function calculateOverallSentiment(breakdown: SentimentBreakdown): SentimentType;
```

**Implementation Options**:
1. **External AI Service (Recommended)**: Claude API or OpenAI for accurate sentiment
2. **Lightweight Alternative**: Sentiment.js library for basic analysis
3. **Hybrid**: Use lightweight for real-time, AI for batch processing

### Task 2.3: Create Intent Classification Module

**File**: `lib/dm-analysis/intent.ts`

```typescript
// Intent categories to detect:
const INTENT_PATTERNS = {
    support_request: ['help', 'issue', 'problem', 'not working', 'broken', 'error'],
    feedback: ['love', 'great', 'amazing', 'suggest', 'would be nice', 'feedback'],
    inquiry: ['how', 'what', 'when', 'where', 'can you', 'do you', 'is there'],
    complaint: ['disappointed', 'frustrated', 'angry', 'terrible', 'worst', 'refund'],
    purchase_intent: ['buy', 'purchase', 'price', 'cost', 'order', 'available'],
};

export async function classifyIntent(text: string): Promise<IntentResult>;
export function aggregateIntents(results: IntentResult[]): DetectedIntent[];
```

### Task 2.4: Create Conversation Health Calculator

**File**: `lib/dm-analysis/health.ts`

```typescript
export function calculateResponseTime(messages: Message[]): number;
export function calculateMessageFrequency(messages: Message[]): number;
export function calculateEngagementScore(metrics: HealthMetrics): number;
export function classifyUserSegment(metrics: HealthMetrics, analysis: Analysis): UserSegment;
```

### Task 2.5: Create Analysis Orchestrator

**File**: `lib/dm-analysis/orchestrator.ts`

```typescript
export class DMAnalysisOrchestrator {
    async analyzeConversation(request: AnalyzeConversationRequest): Promise<AnalyzeConversationResponse>;
    async batchAnalyze(request: BatchAnalysisRequest): Promise<BatchAnalysisResponse>;
    async reanalyzeStale(userId: string, staleDays: number): Promise<number>;
    async generateDailyAnalytics(userId: string, date: Date): Promise<DailyAnalytics>;
}
```

---

## Phase 3: API Endpoints (Week 3)

### Task 3.1: Single Conversation Analysis

**File**: `app/api/messages/[id]/analysis/route.ts`

```typescript
// GET /api/messages/[id]/analysis - Get analysis for conversation
// POST /api/messages/[id]/analysis - Trigger new analysis
// DELETE /api/messages/[id]/analysis - Clear analysis data
```

### Task 3.2: Batch Analysis Endpoint

**File**: `app/api/dm-analysis/batch/route.ts`

```typescript
// POST /api/dm-analysis/batch - Analyze multiple conversations
// GET /api/dm-analysis/batch/[jobId] - Get batch job status
```

### Task 3.3: Analytics Dashboard API

**File**: `app/api/dm-analysis/analytics/route.ts`

```typescript
// GET /api/dm-analysis/analytics?period=week - Get analytics summary
// GET /api/dm-analysis/analytics/trends - Get trend data
// GET /api/dm-analysis/analytics/segments - Get user segment distribution
```

### Task 3.4: Webhook Integration (Auto-analyze on new message)

**File**: Update `app/api/webhook/instagram/route.ts`

Add optional auto-analysis trigger when new messages arrive:
- Queue conversation for re-analysis after message received
- Debounce to avoid excessive API calls (analyze once per 5 minutes max)

---

## Phase 4: Dashboard UI (Week 4)

### Task 4.1: Analytics Overview Component

**File**: `app/components/analytics/AnalyticsOverview.tsx`

- Summary cards: Total conversations, sentiment distribution, response rate
- Trend charts: Message volume over time, sentiment trends
- Quick stats: Top topics, common intents

### Task 4.2: Conversation Analysis Detail

**File**: `app/components/analytics/ConversationAnalysisDetail.tsx`

- Sentiment timeline for conversation
- Intent detection highlights
- Extracted topics and keywords
- Engagement score visualization

### Task 4.3: Analytics Dashboard Page

**File**: `app/(protected)/analytics/page.tsx`

- Main analytics dashboard with all components
- Date range selector
- Filter by sentiment/intent/segment
- Export functionality

---

## Phase 5: Testing Strategy

### Unit Tests

**Location**: `__tests__/lib/dm-analysis/`

| Test File | Coverage Target | Key Scenarios |
|-----------|-----------------|---------------|
| `analyzer.test.ts` | 90% | Happy path, empty conversation, error handling |
| `sentiment.test.ts` | 95% | Positive/negative/neutral text, edge cases |
| `intent.test.ts` | 95% | Each intent type, ambiguous messages |
| `health.test.ts` | 90% | Response time calculation, engagement scoring |
| `orchestrator.test.ts` | 85% | Full flow, batch processing, error recovery |

### Integration Tests

**Location**: `__tests__/integration/dm-analysis/`

| Test File | Coverage Target | Key Scenarios |
|-----------|-----------------|---------------|
| `api-routes.test.ts` | 80% | All endpoints, auth, validation |
| `database.test.ts` | 85% | CRUD operations, RLS policies |
| `webhook-trigger.test.ts` | 80% | Auto-analysis on message receive |

### E2E Tests

**Location**: `tests/e2e/analytics/`

| Test File | Key Scenarios |
|-----------|---------------|
| `analytics-dashboard.spec.ts` | View analytics, filter, date range |
| `conversation-analysis.spec.ts` | Trigger analysis, view results |

### Mock Data Requirements

```typescript
// __tests__/fixtures/dm-analysis/
export const mockConversation = {...};
export const mockMessages = [...];
export const mockSentimentResponses = {...};
export const mockAnalysisResults = {...};
```

### Test Execution Order

1. **Unit tests first**: `npm run test -- __tests__/lib/dm-analysis/`
2. **Integration tests**: `npm run test -- __tests__/integration/dm-analysis/`
3. **E2E tests**: `npm run test:e2e -- tests/e2e/analytics/`

---

## Implementation Checklist

### Phase 1: Database & Types (Effort: 4-5h)
- [ ] Create migration file for dm_analysis tables
- [ ] Run migration on local Supabase
- [ ] Create type definitions file
- [ ] Write mapping functions
- [ ] Unit tests for mapping functions

### Phase 2: Core Library (Effort: 16-20h)
- [ ] Implement sentiment analysis module
- [ ] Implement intent classification module
- [ ] Implement topic/keyword extraction
- [ ] Implement conversation health calculator
- [ ] Implement user segmentation logic
- [ ] Create analysis orchestrator
- [ ] Unit tests for each module (90%+ coverage)

### Phase 3: API Endpoints (Effort: 6-8h)
- [ ] Single conversation analysis endpoint
- [ ] Batch analysis endpoint
- [ ] Analytics summary endpoint
- [ ] Update webhook for auto-analysis
- [ ] Integration tests for all endpoints

### Phase 4: Dashboard UI (Effort: 10-12h)
- [ ] Analytics overview component
- [ ] Conversation analysis detail component
- [ ] Trend charts component
- [ ] Main analytics page
- [ ] E2E tests for dashboard

### Phase 5: Polish & Documentation (Effort: 4-5h)
- [ ] API documentation
- [ ] Update CLAUDE.md with analysis patterns
- [ ] Performance optimization (caching, batching)
- [ ] Final test coverage verification

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI API rate limits | Implement request queuing and caching |
| Slow analysis on large conversations | Process in batches, show progress |
| Inaccurate sentiment/intent | Start with conservative thresholds, allow user feedback |
| Database performance | Pre-aggregate daily analytics, use indexes |
| Test flakiness | Use MSW for consistent API mocking |

---

## Success Criteria

1. **Functional**: All conversation analysis features working end-to-end
2. **Performance**: Analysis completes in <5s for conversations with <100 messages
3. **Accuracy**: Sentiment accuracy >80% on test dataset
4. **Coverage**: 85%+ test coverage on new code
5. **Quality**: Zero lint errors, zero TypeScript errors

---

## Dependencies

### Required
- Existing messaging infrastructure (✅ Already complete)
- Supabase database access
- AI service for sentiment/intent (Claude API or OpenAI)

### Optional
- Redis for caching (improves performance)
- Background job processor (for batch analysis)

---

## Next Steps

1. Review this plan with stakeholders
2. Claim Phase 1 tasks in PROJECT_STATUS.md
3. Begin implementation starting with database migration
4. Create feature branch: `feature/dm-analysis`

---

**Document Version**: 1.0
**Author**: Claude Code Session
**Last Updated**: 2026-02-05
