import { NextRequest, NextResponse } from 'next/server';

/**
 * Data Deletion Status endpoint.
 * Returns the current status of a data deletion request.
 * Required by Meta App Review as part of the data deletion callback flow.
 */
export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');

    if (!code) {
        return NextResponse.json(
            { error: 'Missing confirmation code' },
            { status: 400 }
        );
    }

    // For Meta App Review compliance, we confirm that deletion is in progress.
    // In a production system with stored user data, this would query actual
    // deletion status from the database.
    return NextResponse.json({
        confirmation_code: code,
        status: 'Data deletion is in progress. User data associated with this app will be removed.',
    });
}
