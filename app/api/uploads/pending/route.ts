import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getUserId } from '@/lib/auth-helpers';
import { Logger } from '@/lib/utils/logger';
import { preventWriteForDemo } from '@/lib/preview-guard';

const MODULE = 'api:uploads:pending';

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const userId = getUserId(session);
		const { storagePath } = await req.json();

		if (!storagePath) {
			return NextResponse.json(
				{ error: 'Missing storagePath' },
				{ status: 400 },
			);
		}

		const { error } = await supabaseAdmin.from('pending_uploads').upsert({
			storage_path: storagePath,
			user_id: userId,
		});

		if (error) {
			Logger.error(
				MODULE,
				`Error saving pending upload: ${error.message}`,
				error,
			);
			return NextResponse.json(
				{ error: 'Failed to record upload' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		Logger.error(MODULE, 'POST error', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const userId = getUserId(session);
		const { searchParams } = new URL(req.url);
		const storagePath = searchParams.get('storagePath');

		if (!storagePath) {
			return NextResponse.json(
				{ error: 'Missing storagePath' },
				{ status: 400 },
			);
		}

		const { error } = await supabaseAdmin
			.from('pending_uploads')
			.delete()
			.eq('storage_path', storagePath)
			.eq('user_id', userId);

		if (error) {
			Logger.error(
				MODULE,
				`Error deleting pending upload: ${error.message}`,
				error,
			);
			return NextResponse.json(
				{ error: 'Failed to delete record' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		Logger.error(MODULE, 'DELETE error', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}
