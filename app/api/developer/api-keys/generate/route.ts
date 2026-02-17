import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { generateApiKey } from '@/lib/auth/api-keys';
import { createApiKey } from '@/lib/database/api-keys';
import { Logger } from '@/lib/utils/logger';
import { z } from 'zod';

const MODULE = 'api:developer:api-keys:generate';
const GenerateApiKeySchema = z.object({
  name: z.string().optional(),
  scopes: z.array(z.string()).optional().default(['cron:read', 'logs:read']),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    requireDeveloper(session);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validation = GenerateApiKeySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.issues }, { status: 400 });
    }

    const { name, scopes, expiresAt } = validation.data;
    const { key, hash, prefix } = await generateApiKey();
    const apiKey = await createApiKey({ userId: session.user.id, keyHash: hash, keyPrefix: prefix, name, scopes, expiresAt });

    if (!apiKey) return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });

    Logger.info(MODULE, 'API key generated', { userId: session.user.id, keyId: apiKey.id });
    return NextResponse.json({
      key,
      apiKey: { id: apiKey.id, keyPrefix: apiKey.keyPrefix, name: apiKey.name, scopes: apiKey.scopes, createdAt: apiKey.createdAt, expiresAt: apiKey.expiresAt },
    });
  } catch (error) {
    Logger.error(MODULE, 'Error generating API key', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate API key' }, { status: 500 });
  }
}
