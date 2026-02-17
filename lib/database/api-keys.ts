import { supabaseAdmin } from '@/lib/config/supabase-admin';

export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name?: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

interface CreateApiKeyParams {
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name?: string;
  scopes: string[];
  expiresAt?: string;
}

/**
 * Create a new API key record in the database
 */
export async function createApiKey(params: CreateApiKeyParams): Promise<ApiKey | null> {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      user_id: params.userId,
      key_hash: params.keyHash,
      key_prefix: params.keyPrefix,
      name: params.name,
      scopes: params.scopes,
      expires_at: params.expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create API key:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    keyHash: data.key_hash,
    keyPrefix: data.key_prefix,
    name: data.name,
    scopes: data.scopes,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    lastUsedAt: data.last_used_at,
    revokedAt: data.revoked_at,
  };
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Failed to get user API keys:', error);
    return [];
  }

  return data.map((row: {
    id: string;
    user_id: string;
    key_hash: string;
    key_prefix: string;
    name?: string;
    scopes: string[];
    created_at: string;
    expires_at?: string;
    last_used_at?: string;
    revoked_at?: string;
  }) => ({
    id: row.id,
    userId: row.user_id,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    name: row.name,
    scopes: row.scopes,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  }));
}

/**
 * Alias for getUserApiKeys (for compatibility)
 */
export const listUserApiKeys = getUserApiKeys;

/**
 * Get a single API key by ID
 */
export async function getApiKeyById(keyId: string, userId: string): Promise<ApiKey | null> {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('id', keyId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to get API key:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    keyHash: data.key_hash,
    keyPrefix: data.key_prefix,
    name: data.name,
    scopes: data.scopes,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    lastUsedAt: data.last_used_at,
    revokedAt: data.revoked_at,
  };
}

/**
 * Update an API key
 */
export async function updateApiKey(
  keyId: string,
  userId: string,
  updates: Partial<Pick<ApiKey, 'name' | 'scopes' | 'expiresAt'>>
): Promise<ApiKey | null> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.scopes !== undefined) dbUpdates.scopes = updates.scopes;
  if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .update(dbUpdates)
    .eq('id', keyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to update API key:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    keyHash: data.key_hash,
    keyPrefix: data.key_prefix,
    name: data.name,
    scopes: data.scopes,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    lastUsedAt: data.last_used_at,
    revokedAt: data.revoked_at,
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to revoke API key:', error);
    return false;
  }

  return true;
}

/**
 * Update API key last used timestamp
 */
export async function updateApiKeyUsage(keyId: string): Promise<void> {
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}
