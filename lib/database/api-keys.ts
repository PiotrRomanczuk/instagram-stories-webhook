/**
 * API Keys Database Queries
 *
 * Database operations for API key management.
 * All operations use supabaseAdmin for service-level access.
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import type { ApiKey } from '@/lib/auth/api-keys';

const MODULE = 'db:api-keys';

/**
 * Database representation of API key (snake_case from Postgres)
 */
interface ApiKeyRow {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

/**
 * Convert database row to ApiKey interface
 */
function rowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    name: row.name ?? undefined,
    scopes: row.scopes,
    lastUsedAt: row.last_used_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? undefined,
  };
}

/**
 * Create a new API key
 *
 * @param data - API key data
 * @returns Created API key or null if error
 *
 * @example
 * ```ts
 * const { key, hash, prefix } = await generateApiKey();
 * const apiKey = await createApiKey({
 *   userId: 'user_123',
 *   keyHash: hash,
 *   keyPrefix: prefix,
 *   name: 'iPhone Widget',
 *   scopes: ['cron:read', 'logs:read'],
 *   expiresAt: '2027-01-01T00:00:00Z'
 * });
 * ```
 */
export async function createApiKey(data: {
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name?: string;
  scopes?: string[];
  expiresAt?: string;
}): Promise<ApiKey | null> {
  try {
    Logger.info(MODULE, `Creating API key for user ${data.userId}`, {
      name: data.name,
      scopes: data.scopes,
    });

    const { data: result, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: data.userId,
        key_hash: data.keyHash,
        key_prefix: data.keyPrefix,
        name: data.name ?? null,
        scopes: data.scopes ?? ['cron:read', 'logs:read'],
        expires_at: data.expiresAt ?? null,
      })
      .select()
      .single();

    if (error) {
      Logger.error(MODULE, `Error creating API key: ${error.message}`, error);
      return null;
    }

    Logger.info(MODULE, `API key created successfully: ${result.id}`);
    return rowToApiKey(result);
  } catch (error) {
    Logger.error(MODULE, 'Unexpected error creating API key', error);
    return null;
  }
}

/**
 * Get API key by key prefix
 *
 * Used for fast lookup during authentication.
 * Returns all active keys with matching prefix (to handle hash comparison).
 *
 * @param keyPrefix - First 16 characters of the key (e.g., "sk_live_abc123de")
 * @returns Array of matching API keys (may be empty)
 */
export async function getApiKeysByPrefix(keyPrefix: string): Promise<ApiKey[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .is('revoked_at', null);

    if (error) {
      Logger.error(MODULE, `Error fetching API keys by prefix: ${error.message}`, error);
      return [];
    }

    return data ? data.map(rowToApiKey) : [];
  } catch (error) {
    Logger.error(MODULE, 'Unexpected error fetching API keys by prefix', error);
    return [];
  }
}

/**
 * Update last used timestamp for an API key
 *
 * Called asynchronously after successful authentication (don't await).
 *
 * @param keyId - API key ID
 */
export async function updateLastUsedAt(keyId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);

    if (error) {
      Logger.warn(MODULE, `Error updating last_used_at for key ${keyId}: ${error.message}`);
    }
  } catch (error) {
    Logger.warn(MODULE, 'Unexpected error updating last_used_at', error);
  }
}

/**
 * Revoke an API key
 *
 * Sets revoked_at timestamp, making the key unusable.
 *
 * @param keyId - API key ID
 * @returns True if revoked successfully
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  try {
    Logger.info(MODULE, `Revoking API key: ${keyId}`);

    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId);

    if (error) {
      Logger.error(MODULE, `Error revoking API key: ${error.message}`, error);
      return false;
    }

    Logger.info(MODULE, `API key revoked successfully: ${keyId}`);
    return true;
  } catch (error) {
    Logger.error(MODULE, 'Unexpected error revoking API key', error);
    return false;
  }
}

/**
 * List all active API keys for a user
 *
 * Returns only non-revoked keys, ordered by creation date (newest first).
 *
 * @param userId - User ID
 * @returns Array of API keys
 */
export async function listUserApiKeys(userId: string): Promise<ApiKey[]> {
  try {
    Logger.debug(MODULE, `Fetching API keys for user ${userId}`);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      Logger.error(MODULE, `Error fetching user API keys: ${error.message}`, error);
      return [];
    }

    return data ? data.map(rowToApiKey) : [];
  } catch (error) {
    Logger.error(MODULE, 'Unexpected error fetching user API keys', error);
    return [];
  }
}

/**
 * Get a specific API key by ID
 *
 * @param keyId - API key ID
 * @returns API key or null if not found
 */
export async function getApiKeyById(keyId: string): Promise<ApiKey | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      Logger.error(MODULE, `Error fetching API key by ID: ${error.message}`, error);
      return null;
    }

    return rowToApiKey(data);
  } catch (error) {
    Logger.error(MODULE, 'Unexpected error fetching API key by ID', error);
    return null;
  }
}

/**
 * Update API key metadata (name, scopes)
 *
 * Cannot update key_hash or key_prefix (security).
 *
 * @param keyId - API key ID
 * @param updates - Fields to update
 * @returns True if updated successfully
 */
export async function updateApiKey(
  keyId: string,
  updates: {
    name?: string;
    scopes?: string[];
  }
): Promise<boolean> {
  try {
    Logger.info(MODULE, `Updating API key: ${keyId}`, updates);

    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({
        name: updates.name,
        scopes: updates.scopes,
      })
      .eq('id', keyId);

    if (error) {
      Logger.error(MODULE, `Error updating API key: ${error.message}`, error);
      return false;
    }

    Logger.info(MODULE, `API key updated successfully: ${keyId}`);
    return true;
  } catch (error) {
    Logger.error(MODULE, 'Unexpected error updating API key', error);
    return false;
  }
}
