'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Loader2, Plus, Key, AlertCircle } from 'lucide-react';
import { ApiKeyCard } from './api-key-card';
import { GenerateApiKeyDialog } from './generate-api-key-dialog';
import { ApiKeySuccessDialog } from './api-key-success-dialog';

export interface ApiKey {
  id: string;
  keyPrefix: string;
  name?: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface GeneratedApiKey {
  key: string;
  apiKey: ApiKey;
}

export function ApiKeysManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedApiKey | null>(null);

  useEffect(() => { fetchApiKeys(); }, []);

  async function fetchApiKeys() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/developer/api-keys');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch API keys');
      setApiKeys(data.apiKeys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(data: { name?: string; scopes?: string[]; expiresAt?: string }) {
    const response = await fetch('/api/developer/api-keys/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to generate API key');
    setGeneratedKey(result);
    setGenerateDialogOpen(false);
    await fetchApiKeys();
  }

  async function handleRevoke(keyId: string) {
    try {
      const response = await fetch(`/api/developer/api-keys/${keyId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to revoke API key');
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />API Keys</CardTitle>
            <CardDescription>Manage API keys for mobile widgets and external integrations</CardDescription>
          </div>
          <Button onClick={() => setGenerateDialogOpen(true)} className="gap-2" disabled={loading}>
            <Plus className="h-4 w-4" />Generate New Key
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        {loading && <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-sm text-gray-500">Loading API keys...</span></div>}
        {!loading && apiKeys.length === 0 && (
          <div className="text-center py-8">
            <Key className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No API keys yet</h3>
            <p className="text-sm text-gray-500 mb-4">Generate your first API key to start using the mobile widget.</p>
            <Button onClick={() => setGenerateDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Generate New Key</Button>
          </div>
        )}
        {!loading && apiKeys.length > 0 && (
          <div className="space-y-3">{apiKeys.map((apiKey) => <ApiKeyCard key={apiKey.id} apiKey={apiKey} onRevoke={handleRevoke} />)}</div>
        )}
        {!loading && apiKeys.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">Using API Keys</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• API keys allow external access without session cookies</li>
              <li>• Use for mobile widgets, scripts, and integrations</li>
              <li>• Test your keys at <code className="bg-blue-100 px-1 rounded">/test-api-key</code></li>
            </ul>
          </div>
        )}
      </CardContent>
      <GenerateApiKeyDialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen} onGenerate={handleGenerate} />
      {generatedKey && <ApiKeySuccessDialog generatedKey={generatedKey} open={!!generatedKey} onOpenChange={(open) => !open && setGeneratedKey(null)} />}
    </Card>
  );
}
