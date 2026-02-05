import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { publishMedia } from '@/lib/instagram';
import { processImageForStory } from '@/lib/media/story-processor';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

/**
 * DEBUG ENDPOINT: Direct publish to Instagram without scheduler
 * POST /api/debug/publish
 * Body: { url: string, type: 'IMAGE' | 'VIDEO' }
 */
export async function POST(request: NextRequest) {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    const startTime = Date.now();
    const logs: string[] = [];
    
    const log = (msg: string) => {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${msg}`;
        logs.push(entry);
        console.log(`[DEBUG-PUBLISH] ${msg}`);
    };

    try {
        log('🚀 Debug publish request received');
        
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            log('❌ Unauthorized - no session');
            return NextResponse.json({ 
                error: 'Unauthorized', 
                logs 
            }, { status: 401 });
        }
        log(`✅ User authenticated: ${session.user.email} (${session.user.id})`);

        // 2. Parse body
        const body = await request.json();
        const { url, type = 'IMAGE', userTags = [] } = body;

        if (!url) {
            log('❌ Missing URL in request body');
            return NextResponse.json({
                error: 'Missing URL',
                logs
            }, { status: 400 });
        }
        log(`📷 Media URL: ${url}`);
        log(`📋 Media Type: ${type}`);

        // Log user tags if present
        if (userTags && Array.isArray(userTags) && userTags.length > 0) {
            log(`🏷️ User Tags: ${userTags.length} tag(s)`);
            userTags.forEach((tag: { username: string; x: number; y: number }, idx: number) => {
                log(`   Tag ${idx + 1}: @${tag.username} at (${tag.x}, ${tag.y})`);
            });
        }

        // 3. Process image for story format (9:16 with blurred background)
        let publishUrl = url;
        if (type === 'IMAGE') {
            log('🎨 Processing image for story format (9:16)...');
            try {
                const processedBuffer = await processImageForStory(url);
                log(`✅ Image processed: ${processedBuffer.length} bytes`);

                // Upload processed image to storage
                const filename = `debug-processed-${Date.now()}.jpg`;
                const storagePath = `uploads/${filename}`;

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('stories')
                    .upload(storagePath, processedBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true,
                    });

                if (uploadError) {
                    log(`⚠️ Failed to upload processed image: ${uploadError.message}`);
                    log('📤 Falling back to original URL...');
                } else {
                    const { data: urlData } = supabaseAdmin.storage
                        .from('stories')
                        .getPublicUrl(storagePath);
                    publishUrl = urlData.publicUrl;
                    log(`✅ Processed image uploaded: ${publishUrl}`);
                }
            } catch (processError) {
                const errMsg = processError instanceof Error ? processError.message : 'Unknown error';
                log(`⚠️ Image processing failed: ${errMsg}`);
                log('📤 Falling back to original URL...');
            }
        }

        // 4. Attempt direct publish
        log('📤 Calling publishMedia...');

        const result = await publishMedia(
            publishUrl,
            type,
            'STORY', // Always story for debug
            '', // No caption
            session.user.id,
            userTags // Pass user tags from request body
        );

        const duration = Date.now() - startTime;
        log(`✅ SUCCESS! Published in ${duration}ms`);
        log(`📌 Instagram Media ID: ${result.id}`);

        return NextResponse.json({
            success: true,
            result,
            duration,
            logs
        });

    } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        log(`❌ FAILED after ${duration}ms: ${errorMessage}`);
        if (errorStack) {
            log(`Stack: ${errorStack.split('\n').slice(0, 3).join(' | ')}`);
        }

        return NextResponse.json({
            success: false,
            error: errorMessage,
            duration,
            logs
        }, { status: 500 });
    }
}
