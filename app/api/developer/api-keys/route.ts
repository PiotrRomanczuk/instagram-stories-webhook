import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { listUserApiKeys } from '@/lib/database/api-keys';
import { Logger } from '@/lib/utils/logger';
import type { ApiKey } from '@/lib/auth/api-keys';

const MODULE = 'api:developer:api-keys:list';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    requireDeveloper(session);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKeys = await listUserApiKeys(session.user.id);
    return NextResponse.json({
      apiKeys: apiKeys.map((key: ApiKey) => ({
        id: key.id, keyPrefix: key.keyPrefix, name: key.name, scopes: key.scopes,
        lastUsedAt: key.lastUsedAt, expiresAt: key.expiresAt, createdAt: key.createdAt,
      })),
    });
  } catch (error) {
    Logger.error(MODULE, 'Error listing API keys', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to list API keys' }, { status: 500 });
  }
}
