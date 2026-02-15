import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'auth';

/**
 * Parses a Facebook signed_request parameter.
 * See: https://developers.facebook.com/docs/games/gamesonfacebook/login#parsingsr
 */
function parseSignedRequest(
    signedRequest: string,
    appSecret: string
): { user_id: string; algorithm: string; issued_at: number } | null {
    const [encodedSig, payload] = signedRequest.split('.', 2);

    if (!encodedSig || !payload) {
        return null;
    }

    // Decode the signature
    const sig = Buffer.from(
        encodedSig.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
    );

    // Compute expected signature
    const expectedSig = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest();

    // Verify signature using timing-safe comparison
    if (!crypto.timingSafeEqual(sig, expectedSig)) {
        return null;
    }

    // Decode and parse the payload
    const data = JSON.parse(
        Buffer.from(
            payload.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
        ).toString('utf-8')
    );

    return data;
}

/**
 * Meta Data Deletion Callback endpoint.
 * Required for Meta App Review compliance.
 *
 * When a user requests deletion of their data through Facebook,
 * Meta sends a POST request to this endpoint with a signed_request.
 * We respond with a confirmation code and status URL.
 */
export async function POST(req: NextRequest) {
    try {
        const appSecret =
            process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;

        if (!appSecret) {
            await Logger.error(
                MODULE,
                'Data deletion callback received but no FB app secret configured'
            );
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const formData = await req.formData();
        const signedRequest = formData.get('signed_request');

        if (!signedRequest || typeof signedRequest !== 'string') {
            return NextResponse.json(
                { error: 'Missing signed_request parameter' },
                { status: 400 }
            );
        }

        const data = parseSignedRequest(signedRequest, appSecret);

        if (!data) {
            await Logger.warn(
                MODULE,
                'Data deletion callback: invalid signed_request signature'
            );
            return NextResponse.json(
                { error: 'Invalid signed_request' },
                { status: 403 }
            );
        }

        const fbUserId = data.user_id;
        const confirmationCode = `del_${fbUserId}_${Date.now()}`;

        await Logger.info(
            MODULE,
            `Data deletion request received for Facebook user: ${fbUserId}`,
            { confirmationCode }
        );

        // Build the status URL where Meta (or the user) can check deletion status
        const baseUrl =
            process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
        const statusUrl = `${baseUrl}/api/auth/data-deletion/status?code=${encodeURIComponent(confirmationCode)}`;

        return NextResponse.json({
            url: statusUrl,
            confirmation_code: confirmationCode,
        });
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(
            MODULE,
            `Data deletion callback error: ${errorMessage}`,
            error
        );
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
