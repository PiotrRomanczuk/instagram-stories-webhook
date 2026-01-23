import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { publishMedia } from '@/lib/instagram';

/**
 * DEBUG ENDPOINT: Direct publish to Instagram without scheduler
 * POST /api/debug/publish
 * Body: { url: string, type: 'IMAGE' | 'VIDEO' }
 */
export async function POST(request: NextRequest) {
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
        const { url, type = 'IMAGE' } = body;
        
        if (!url) {
            log('❌ Missing URL in request body');
            return NextResponse.json({ 
                error: 'Missing URL', 
                logs 
            }, { status: 400 });
        }
        log(`📷 Media URL: ${url}`);
        log(`📋 Media Type: ${type}`);

        // 3. Attempt direct publish
        log('📤 Calling publishMedia directly...');
        
        const result = await publishMedia(
            url,
            type,
            'STORY', // Always story for debug
            '', // No caption
            session.user.id,
            [] // No user tags
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
