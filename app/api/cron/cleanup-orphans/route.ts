import { NextRequest, NextResponse } from 'next/server';
import { cleanupOrphanedUploads } from '@/lib/storage/cleanup';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:cron:cleanup';

export async function GET(req: NextRequest) {
	try {
		// Authenticate cron job if needed (e.g. CRON_SECRET)
		const authHeader = req.headers.get('authorization');
		if (
			process.env.CRON_SECRET &&
			authHeader !== `Bearer ${process.env.CRON_SECRET}`
		) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		Logger.info(MODULE, 'Starting orphaned uploads cleanup cron job');
		const results = await cleanupOrphanedUploads();

		return NextResponse.json({
			success: true,
			...results,
		});
	} catch (error) {
		Logger.error(MODULE, 'Cron job failed', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}
