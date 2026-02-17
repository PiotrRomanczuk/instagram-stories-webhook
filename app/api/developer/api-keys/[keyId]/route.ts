import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { getApiKeyById, revokeApiKey, updateApiKey } from '@/lib/database/api-keys';
import { Logger } from '@/lib/utils/logger';
import { z } from 'zod';

const MODULE = 'api:developer:api-keys:key-id';
const UpdateApiKeySchema = z.object({ name: z.string().optional(), scopes: z.array(z.string()).optional() });

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    requireDeveloper(session);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { keyId } = await params;
    const apiKey = await getApiKeyById(keyId);
    if (!apiKey) return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    if (apiKey.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const success = await revokeApiKey(keyId);
    if (!success) return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });

    Logger.info(MODULE, 'API key revoked', { userId: session.user.id, keyId });
    return NextResponse.json({ success: true, message: 'API key revoked successfully' });
  } catch (error) {
    Logger.error(MODULE, 'Error revoking API key', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to revoke API key' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    requireDeveloper(session);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { keyId } = await params;
    const apiKey = await getApiKeyById(keyId);
    if (!apiKey) return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    if (apiKey.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const validation = UpdateApiKeySchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Invalid request body', details: validation.error.issues }, { status: 400 });

    const success = await updateApiKey(keyId, validation.data);
    if (!success) return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });

    const updatedKey = await getApiKeyById(keyId);
    Logger.info(MODULE, 'API key updated', { userId: session.user.id, keyId });

    return NextResponse.json({
      apiKey: updatedKey ? { id: updatedKey.id, keyPrefix: updatedKey.keyPrefix, name: updatedKey.name, scopes: updatedKey.scopes, lastUsedAt: updatedKey.lastUsedAt, expiresAt: updatedKey.expiresAt, createdAt: updatedKey.createdAt } : null,
    });
  } catch (error) {
    Logger.error(MODULE, 'Error updating API key', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update API key' }, { status: 500 });
  }
}
