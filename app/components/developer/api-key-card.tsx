'use client';
import { useState } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Calendar, Clock, Shield, Trash2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ApiKey } from './api-keys-manager';

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onRevoke: (keyId: string) => Promise<void>;
}

export function ApiKeyCard({ apiKey, onRevoke }: ApiKeyCardProps) {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  async function handleRevoke() {
    setIsRevoking(true);
    try {
      await onRevoke(apiKey.id);
      setRevokeDialogOpen(false);
    } finally {
      setIsRevoking(false);
    }
  }

  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();
  const expiresSoon = apiKey.expiresAt && !isExpired &&
    new Date(apiKey.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <>
      <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              {apiKey.name ? (
                <h3 className="font-semibold text-sm truncate">{apiKey.name}</h3>
              ) : (
                <h3 className="font-semibold text-sm text-muted-foreground">Unnamed Key</h3>
              )}
            </div>
            <code className="text-xs bg-muted px-2 py-1 rounded block mb-3 truncate">
              {apiKey.keyPrefix}...
            </code>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {apiKey.scopes.map((scope) => (
                <Badge key={scope} variant="secondary" className="text-xs">
                  {scope}
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Created {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}</span>
              </div>
              {apiKey.lastUsedAt ? (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last used {formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-yellow-600">Never used</span>
                </div>
              )}
              {apiKey.expiresAt && (
                <div className="flex items-center gap-1.5 sm:col-span-2">
                  <AlertCircle className={`h-3.5 w-3.5 ${isExpired ? 'text-red-600' : expiresSoon ? 'text-yellow-600' : ''}`} />
                  <span className={isExpired ? 'text-red-600 font-medium' : expiresSoon ? 'text-yellow-600' : ''}>
                    {isExpired
                      ? `Expired ${formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })}`
                      : `Expires ${formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })}`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setRevokeDialogOpen(true)}
            aria-label="Revoke API key"
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Applications using this key will immediately lose access.
              {apiKey.name && (
                <span className="block mt-2 font-medium text-foreground">
                  Key: {apiKey.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
