/**
 * Meme Archiver for AI Analysis
 * Handles saving published memes to Supabase storage for AI processing
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import axios from 'axios';

const MODULE = 'ai-analysis:meme-archiver';
const BUCKET_NAME = 'ai-analysis';

interface SaveMemeForAnalysisOptions {
    memeId: string;
    igMediaId: string;
    mediaUrl: string;
    fileType: 'image' | 'video';
    fileName: string;
}

interface AnalysisRecord {
    id: string;
    memeId: string;
    igMediaId: string;
    storagePath: string;
    status: 'pending' | 'processed' | 'failed' | 'archived';
    fileType: 'image' | 'video';
    fileSizeBytes?: number;
    createdAt: string;
}

/**
 * Save a published meme to the AI analysis bucket
 * Downloads from the original URL and stores in private bucket
 */
export async function saveMemeForAnalysis(
    options: SaveMemeForAnalysisOptions
): Promise<AnalysisRecord | null> {
    const { memeId, igMediaId, mediaUrl, fileType, fileName } = options;

    try {
        Logger.info(MODULE, `Starting meme archive for ${igMediaId}`, { memeId });

        // 1. Download the media from the URL
        let mediaBuffer: Buffer;
        let fileSizeBytes = 0;

        try {
            const response = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            mediaBuffer = Buffer.from(response.data);
            fileSizeBytes = mediaBuffer.length;

            Logger.debug(MODULE, `Downloaded media: ${fileSizeBytes} bytes`);
        } catch (error) {
            Logger.error(MODULE, `Failed to download media from URL`, {
                error: error instanceof Error ? error.message : String(error),
                url: mediaUrl
            });
            return null;
        }

        // 2. Create storage path: ai-analysis/{year}/{month}/{id}_{filename}
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const storagePath = `${year}/${month}/${igMediaId}_${fileName}`;

        // 3. Upload to ai-analysis bucket
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(storagePath, mediaBuffer, {
                contentType: fileType === 'image' ? 'image/jpeg' : 'video/mp4',
                upsert: false,
                metadata: {
                    memeId,
                    igMediaId,
                    uploadedAt: new Date().toISOString()
                }
            });

        if (uploadError) {
            Logger.error(MODULE, `Failed to upload to storage`, {
                error: uploadError.message,
                path: storagePath
            });

            // Record failure in database
            await recordAnalysisFailure(memeId, igMediaId, uploadError.message);
            return null;
        }

        Logger.debug(MODULE, `Uploaded to storage: ${storagePath}`);

        // 4. Create database record for analysis tracking
        const { data, error: dbError } = await supabaseAdmin
            .from('ai_meme_analysis')
            .insert({
                meme_id: memeId,
                ig_media_id: igMediaId,
                storage_path: storagePath,
                analysis_status: 'pending',
                file_type: fileType,
                file_size_bytes: fileSizeBytes,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            Logger.error(MODULE, `Failed to create analysis record`, {
                error: dbError.message,
                memeId
            });
            return null;
        }

        Logger.info(MODULE, `✅ Meme archived for analysis`, {
            memeId,
            igMediaId,
            storagePath,
            sizeBytes: fileSizeBytes
        });

        return {
            id: data.id,
            memeId: data.meme_id,
            igMediaId: data.ig_media_id,
            storagePath: data.storage_path,
            status: data.analysis_status,
            fileType: data.file_type as 'image' | 'video',
            fileSizeBytes: data.file_size_bytes,
            createdAt: data.created_at
        };
    } catch (error) {
        Logger.error(MODULE, `Exception in saveMemeForAnalysis`, {
            error: error instanceof Error ? error.message : String(error),
            memeId
        });
        return null;
    }
}

/**
 * Get analysis record for a meme
 */
export async function getAnalysisRecord(memeId: string): Promise<AnalysisRecord | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('ai_meme_analysis')
            .select('*')
            .eq('meme_id', memeId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            Logger.error(MODULE, `Error fetching analysis record`, error);
            return null;
        }

        return {
            id: data.id,
            memeId: data.meme_id,
            igMediaId: data.ig_media_id,
            storagePath: data.storage_path,
            status: data.analysis_status,
            fileType: data.file_type,
            fileSizeBytes: data.file_size_bytes,
            createdAt: data.created_at
        };
    } catch (error) {
        Logger.error(MODULE, 'Exception in getAnalysisRecord', error);
        return null;
    }
}

/**
 * List pending memes for analysis
 */
export async function getPendingAnalysisMemes(limit = 50): Promise<AnalysisRecord[]> {
    try {
        const { data, error } = await supabaseAdmin
            .from('ai_meme_analysis')
            .select('*')
            .eq('analysis_status', 'pending')
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            Logger.error(MODULE, `Error fetching pending memes`, error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            memeId: row.meme_id,
            igMediaId: row.ig_media_id,
            storagePath: row.storage_path,
            status: row.analysis_status,
            fileType: row.file_type,
            fileSizeBytes: row.file_size_bytes,
            createdAt: row.created_at
        }));
    } catch (error) {
        Logger.error(MODULE, 'Exception in getPendingAnalysisMemes', error);
        return [];
    }
}

/**
 * Update analysis status with results
 */
export async function updateAnalysisResults(
    analysisId: string,
    analysisData: Record<string, any>
): Promise<boolean> {
    try {
        const { error } = await supabaseAdmin
            .from('ai_meme_analysis')
            .update({
                analysis_status: 'processed',
                analysis_data: analysisData,
                processed_at: new Date().toISOString()
            })
            .eq('id', analysisId);

        if (error) {
            Logger.error(MODULE, `Error updating analysis results`, error);
            return false;
        }

        Logger.info(MODULE, `✅ Analysis results updated`, { analysisId });
        return true;
    } catch (error) {
        Logger.error(MODULE, 'Exception in updateAnalysisResults', error);
        return false;
    }
}

/**
 * Record analysis failure
 */
export async function recordAnalysisFailure(
    memeId: string,
    igMediaId: string,
    errorMessage: string
): Promise<boolean> {
    try {
        const { error } = await supabaseAdmin
            .from('ai_meme_analysis')
            .update({
                analysis_status: 'failed',
                error_message: errorMessage,
                processed_at: new Date().toISOString()
            })
            .eq('ig_media_id', igMediaId);

        if (error && error.code !== 'PGRST116') {
            Logger.warn(MODULE, `Failed to record analysis error`, { error: error.message });
        }

        return true;
    } catch (error) {
        Logger.error(MODULE, 'Exception in recordAnalysisFailure', error);
        return false;
    }
}

/**
 * Get signed download URL for analysis (for external AI services)
 */
export async function getSignedAnalysisUrl(
    storagePath: string,
    expiresIn = 3600
): Promise<string | null> {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .createSignedUrl(storagePath, expiresIn);

        if (error) {
            Logger.error(MODULE, `Error creating signed URL`, error);
            return null;
        }

        return data.signedUrl;
    } catch (error) {
        Logger.error(MODULE, 'Exception in getSignedAnalysisUrl', error);
        return null;
    }
}

/**
 * Archive old analysis records (soft delete - moves to archived status)
 */
export async function archiveOldAnalysis(daysOld = 90): Promise<number> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const { error, data } = await supabaseAdmin
            .from('ai_meme_analysis')
            .update({
                analysis_status: 'archived',
                archived_at: new Date().toISOString()
            })
            .lt('created_at', cutoffDate.toISOString())
            .eq('analysis_status', 'processed')
            .select();

        if (error) {
            Logger.error(MODULE, `Error archiving old records`, error);
            return 0;
        }

        Logger.info(MODULE, `✅ Archived ${data?.length || 0} old analysis records`);
        return data?.length || 0;
    } catch (error) {
        Logger.error(MODULE, 'Exception in archiveOldAnalysis', error);
        return 0;
    }
}
