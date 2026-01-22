/**
 * POST /api/media/process
 * 
 * Processes an image to fit Instagram Story dimensions (9:16 / 1080x1920)
 * 
 * Request body:
 * - imageUrl: string - URL of the image to process
 * - backgroundColor?: string - Hex color for padding (default: #000000)
 * - blurBackground?: boolean - Use blurred image as background instead
 * 
 * Returns:
 * - processedUrl: string - URL of the processed image in Supabase storage
 * - originalDimensions: { width, height }
 * - wasProcessed: boolean
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { processImageForStory } from '@/lib/media/processor';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { imageUrl, backgroundColor, blurBackground } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
        }

        // Fetch the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Process the image
        const result = await processImageForStory(imageBuffer, {
            backgroundColor: backgroundColor || '#000000',
            blurBackground: blurBackground || false,
            quality: 90
        });

        // If no processing was needed, return the original URL
        if (!result.wasProcessed) {
            return NextResponse.json({
                processedUrl: imageUrl,
                originalDimensions: {
                    width: result.originalWidth,
                    height: result.originalHeight
                },
                wasProcessed: false,
                message: 'Image already fits Story dimensions'
            });
        }

        // Upload the processed image to Supabase
        const fileName = `processed/${crypto.randomUUID()}.jpg`;

        const { error: uploadError } = await supabase.storage
            .from('stories')
            .upload(fileName, result.buffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload processed image' }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName);

        return NextResponse.json({
            processedUrl: publicUrl,
            originalDimensions: {
                width: result.originalWidth,
                height: result.originalHeight
            },
            newDimensions: {
                width: result.width,
                height: result.height
            },
            wasProcessed: true,
            processingType: result.processingType,
            message: `Image processed: ${result.processingType}`
        });

    } catch (error) {
        console.error('Processing error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
